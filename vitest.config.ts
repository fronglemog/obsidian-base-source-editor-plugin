import { 
  configDefaults,
  defineConfig 
} from 'vitest/config';

export default defineConfig({
  test: {
    alias: {
      'src/': '/src/'
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