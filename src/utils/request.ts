import Taro from '@tarojs/taro';

const normalizeBaseUrl = (value) => {
  const raw = String(value ?? '').replace(/"/g, '');
  return raw.replace(/\/+$/, '');
};

const joinUrl = (baseUrl, path) => {
  const base = normalizeBaseUrl(baseUrl);
  if (!path) return base;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('/')) return `${base}${path}`;
  return `${base}/${path}`;
};

const sanitizeParams = (data) => {
  if (!data || typeof data !== 'object') return data;
  const cleaned = {};
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (value === undefined || value === null) return;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return;
      if (trimmed === 'undefined' || trimmed === 'null') return;
      cleaned[key] = value;
      return;
    }
    cleaned[key] = value;
  });
  return cleaned;
};

const request = (options) => {
  const { url, method, data, baseUrl } = options;

  // 拼接完整的请求地址
  const fullUrl = joinUrl(baseUrl ?? BASE_URL, url);
  const safeData = sanitizeParams(data);

  return new Promise((resolve, reject) => {
    Taro.request({
      url: fullUrl,
      method: method || 'GET',
      data: safeData,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 只返回业务数据
          resolve(res.data);
        } else {
          // 统一处理错误
          Taro.showToast({
            title: `服务异常: ${res.statusCode}`,
            icon: 'none',
          });
          reject(res);
        }
      },
      fail: (err) => {
        Taro.showToast({
          title: '网络请求失败',
          icon: 'none',
        });
        reject(err);
      }
    });
  });
};

export default request; 
