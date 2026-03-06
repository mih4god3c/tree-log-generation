import path from 'path';

/**
 * @type {import('vite').UserConfig}
 */
export default {
  build: {
    emptyOutDir: true,
    outDir: '../../dist',
    sourcemap: true,
  },
  root: './src/app',
  resolve: {
    alias: {
      'log-generator': path.resolve(
        __dirname,
        'build/log-generator.es.js',
      ),
    },
  },
  server: {
    hmr: true,
  },
};
