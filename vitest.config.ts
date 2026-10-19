import { 
  configDefaults,
  defineConfig 
} from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      'src/': '/src/', 
      'obsidian': '/tests/_mocks/obsidian.ts'
    },
    include : [
      ...configDefaults.include,
      '/tests'
    ],
    exclude: [
      ...configDefaults.exclude,
      '/plugin/**',
    ]
  }
});