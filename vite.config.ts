import { defineConfig } from 'vite';
import path from 'path';
export default defineConfig({
  base: '/inksnow-blog/',
  resolve: {
    alias: {
        '@types': path.resolve(__dirname, '../types'),
        '@client': path.resolve(__dirname, '../client'),
        '@utils': path.resolve(__dirname, '../client/utils'),
        '@components': path.resolve(__dirname, '../client/components'),
        '@composables': path.resolve(__dirname, '../client/composables'),
      },
  },
});
