import fs from 'node:fs'
import path from 'node:path'
import zlib from 'node:zlib'

const SIZE = 81

function hexToRgba(hex, alpha = 255) {
  const normalized = hex.startsWith('#') ? hex.slice(1) : hex
  const r = Number.parseInt(normalized.slice(0, 2), 16)
  const g = Number.parseInt(normalized.slice(2, 4), 16)
  const b = Number.parseInt(normalized.slice(4, 6), 16)
  return [r, g, b, alpha]
}

function makeCrc32Table() {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1)
    table[i] = c >>> 0
  }
  return table
}

const CRC32_TABLE = makeCrc32Table()

function crc32(buffer) {
  let c = 0xffffffff
  for (let i = 0; i < buffer.length; i++) {
    c = CRC32_TABLE[(c ^ buffer[i]) & 0xff] ^ (c >>> 8)
  }
  return (c ^ 0xffffffff) >>> 0
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii')
  const lenBuf = Buffer.alloc(4)
  lenBuf.writeUInt32BE(data.length, 0)
  const crcBuf = Buffer.alloc(4)
  const crc = crc32(Buffer.concat([typeBuf, data]))
  crcBuf.writeUInt32BE(crc, 0)
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf])
}

function encodePngRgba(width, height, rgbaBytes) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8
  ihdr[9] = 6
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  const stride = width * 4
  const raw = Buffer.alloc((stride + 1) * height)
  for (let y = 0; y < height; y++) {
    const rowStart = y * (stride + 1)
    raw[rowStart] = 0
    rgbaBytes.copy(raw, rowStart + 1, y * stride, (y + 1) * stride)
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })
  const idat = pngChunk('IDAT', compressed)
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, pngChunk('IHDR', ihdr), idat, iend])
}

class Img {
  constructor(width, height) {
    this.width = width
    this.height = height
    this.data = Buffer.alloc(width * height * 4, 0)
  }

  setPixel(x, y, rgba) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return
    const i = (y * this.width + x) * 4
    this.data[i + 0] = rgba[0]
    this.data[i + 1] = rgba[1]
    this.data[i + 2] = rgba[2]
    this.data[i + 3] = rgba[3]
  }

  fillRect(x, y, w, h, rgba) {
    const x0 = Math.max(0, x)
    const y0 = Math.max(0, y)
    const x1 = Math.min(this.width, x + w)
    const y1 = Math.min(this.height, y + h)
    for (let yy = y0; yy < y1; yy++) {
      for (let xx = x0; xx < x1; xx++) this.setPixel(xx, yy, rgba)
    }
  }

  strokeRect(x, y, w, h, t, rgba) {
    this.fillRect(x, y, w, t, rgba)
    this.fillRect(x, y + h - t, w, t, rgba)
    this.fillRect(x, y, t, h, rgba)
    this.fillRect(x + w - t, y, t, h, rgba)
  }

  fillCircle(cx, cy, r, rgba) {
    const rr = r * r
    for (let y = cy - r; y <= cy + r; y++) {
      for (let x = cx - r; x <= cx + r; x++) {
        const dx = x - cx
        const dy = y - cy
        if (dx * dx + dy * dy <= rr) this.setPixel(x, y, rgba)
      }
    }
  }

  drawLine(x0, y0, x1, y1, thickness, rgba) {
    let dx = Math.abs(x1 - x0)
    let sx = x0 < x1 ? 1 : -1
    let dy = -Math.abs(y1 - y0)
    let sy = y0 < y1 ? 1 : -1
    let err = dx + dy
    const r = Math.max(0, Math.floor((thickness - 1) / 2))
    while (true) {
      if (r === 0) this.setPixel(x0, y0, rgba)
      else this.fillCircle(x0, y0, r, rgba)
      if (x0 === x1 && y0 === y1) break
      const e2 = 2 * err
      if (e2 >= dy) {
        err += dy
        x0 += sx
      }
      if (e2 <= dx) {
        err += dx
        y0 += sy
      }
    }
  }

  toPng() {
    return encodePngRgba(this.width, this.height, this.data)
  }
}

function drawDashboard(img, color) {
  img.fillRect(19, 56, 10, 16, color)
  img.fillRect(35, 46, 10, 26, color)
  img.fillRect(51, 50, 10, 22, color)

  img.drawLine(17, 55, 63, 33, 4, color)
  img.fillCircle(17, 55, 3, color)
  img.fillCircle(40, 45, 3, color)
  img.fillCircle(63, 33, 3, color)
}

function drawCourses(img, color) {
  const t = 5
  img.strokeRect(14, 18, 26, 48, t, color)
  img.strokeRect(41, 18, 26, 48, t, color)
  img.fillRect(39, 18, 3, 48, color)

  img.fillRect(19, 30, 16, 5, color)
  img.fillRect(19, 41, 16, 5, color)
  img.fillRect(46, 30, 16, 5, color)
  img.fillRect(46, 41, 16, 5, color)
}

function drawStudents(img, color) {
  img.fillCircle(40, 30, 12, color)
  img.fillRect(22, 46, 37, 22, color)
  img.fillCircle(22, 57, 11, color)
  img.fillCircle(58, 57, 11, color)
}

function drawTeachers(img, color) {
  const t = 5
  img.strokeRect(14, 16, 54, 40, t, color)
  img.fillRect(24, 58, 34, 7, color)
  img.fillRect(22, 47, 20, 5, color)
  img.drawLine(62, 62, 74, 30, 4, color)
}

function drawFinance(img, color) {
  const t = 5
  img.strokeRect(16, 28, 50, 34, t, color)
  img.fillRect(16, 28, 50, 10, color)
  img.fillRect(52, 38, 14, 14, color)
  img.fillCircle(54, 45, 4, [0, 0, 0, 0])
  img.fillCircle(54, 45, 4, color)
}

const icons = [
  { name: 'dashboard', draw: drawDashboard },
  { name: 'courses', draw: drawCourses },
  { name: 'students', draw: drawStudents },
  { name: 'teachers', draw: drawTeachers },
  { name: 'finance', draw: drawFinance },
]

function renderIcon(draw, hex) {
  const img = new Img(SIZE, SIZE)
  draw(img, hexToRgba(hex))
  return img.toPng()
}

const outDir = path.join(process.cwd(), 'src/static/images')
fs.mkdirSync(outDir, { recursive: true })

for (const icon of icons) {
  const normal = renderIcon(icon.draw, '#666666')
  const selected = renderIcon(icon.draw, '#007aff')
  fs.writeFileSync(path.join(outDir, `${icon.name}.png`), normal)
  fs.writeFileSync(path.join(outDir, `${icon.name}_selected.png`), selected)
}

console.log(`Generated ${icons.length * 2} tabbar icons in ${outDir}`)

