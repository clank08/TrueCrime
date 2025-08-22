import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./src/test/setup.ts'],
    include: [
      'src/**/__tests__/**/*.test.ts',
      'src/**/test/*.test.ts'
    ],
    exclude: [
      'node_modules',
      'dist',
      '**/*.integration.test.ts',
      '**/*.e2e.test.ts',
      '**/*.contract.test.ts',
      '**/*.performance.test.ts',
      '**/*.security.test.ts'
    ],
    coverage: {
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'src/test',
        '**/*.test.ts',
        '**/__tests__/**',
        '**/test/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@/lib': path.resolve(__dirname, './src/lib'),
      '@/routers': path.resolve(__dirname, './src/routers'),
      '@/services': path.resolve(__dirname, './src/services'),
      '@/workflows': path.resolve(__dirname, './src/workflows'),
      '@/types': path.resolve(__dirname, './src/types'),
      '@/utils': path.resolve(__dirname, './src/utils'),
      '@/config': path.resolve(__dirname, './src/config'),
    }
  },
  esbuild: {
    target: 'node20'
  }
});