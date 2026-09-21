/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./docs/.vuepress/**/*.{js,ts,jsx,tsx,vue}",
    "./docs/**/*.md",
  ],
  theme: {
    extend: {
      colors: {
        // 主题色取自 config.ts 的 primaryColor，使组件与站点其余部分一致
        brand: {
          50: '#eef3fb',
          100: '#dce7f7',
          200: '#b9cfef',
          300: '#96b7e7',
          400: '#7099db',
          500: '#4d78cc',
          600: '#3f63a8',
          700: '#324f85',
          800: '#253b63',
          900: '#192740',
        },
      },
    },
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  }
}
