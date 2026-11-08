import { 
  configDefaults,
  defineConfig 
} from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      '#src/': 'src/', 
      'obsidian': 'tests/_mocks/obsidian.ts'
    },
    include : [
      'tests/**/*.{test,spec}.?(c|m)[jt]s?(x)'
    ],
    exclude: [
      ...configDefaults.exclude,
      '/build/**',
    ]
  }
});