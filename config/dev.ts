import type { UserConfigExport } from "@tarojs/cli";

export default {
   logger: {
    quiet: false,
    stats: true
  },
  defineConstants: {
    BASE_URL: JSON.stringify(process.env.BACKEND_URL || "http://localhost:5005/api/v4")
  }
} satisfies UserConfigExport<'webpack5'>
