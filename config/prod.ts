import type { UserConfigExport } from "@tarojs/cli";
export default {
  logger: {
    quiet: false,
    stats: true
  },
  defineConstants: {
    BASE_URL: '"https://your.production.domain/api/v4"'
  }
} satisfies UserConfigExport<'webpack5'>
