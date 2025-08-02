import type { UserConfigExport } from "@tarojs/cli";
export default {
   logger: {
    quiet: false,
    stats: true
  },
  mini: {},
  h5: {},
  defineConstants: {
    BASE_URL: '"http://localhost:5005/api/v4"'
  }
} satisfies UserConfigExport<'webpack5'>
