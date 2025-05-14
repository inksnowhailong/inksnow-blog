/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./docs/.vuepress/**/*.{js,ts,jsx,tsx,vue}",
    "./docs/**/*.md",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
  corePlugins: {
    preflight: false,
  }
}
