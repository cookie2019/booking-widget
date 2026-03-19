const esbuild = require('esbuild')

esbuild.build({
  entryPoints: ['src/widget.ts'],
  bundle: true,
  minify: true,
  format: 'iife',
  globalName: 'HeyAspenWidget',
  outfile: 'dist/book.js',
  target: ['es2017', 'chrome70', 'firefox68', 'safari12'],
  define: {
    'process.env.NODE_ENV': '"production"'
  }
}).then(() => {
  console.log('✅ dist/book.js built')
}).catch((e) => {
  console.error(e)
  process.exit(1)
})
