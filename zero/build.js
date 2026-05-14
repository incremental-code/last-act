import esbuild from 'esbuild';
import fs from 'fs';
import zlib from 'zlib';

async function build() {
  const result = await esbuild.build({
    entryPoints: ['zero.js'],
    bundle: true,
    minify: true,
    outfile: 'dist/zero.min.js',
    platform: 'browser',
    target: 'es2020'
  });

  const code = fs.readFileSync('dist/zero.min.js', 'utf8');
  const gzipped = zlib.gzipSync(code);
  fs.writeFileSync('dist/zero.min.js.gz', gzipped);

  const stats = {
    minified: code.length,
    gzipped: gzipped.length,
    minifiedKB: (code.length / 1024).toFixed(2),
    gzippedKB: (gzipped.length / 1024).toFixed(2)
  };

  console.log('✓ Build complete');
  console.log(`  Minified: ${stats.minifiedKB} KB (${stats.minified} bytes)`);
  console.log(`  Gzipped:  ${stats.gzippedKB} KB (${stats.gzipped} bytes)`);
}

build().catch(err => {
  console.error(err);
  process.exit(1);
});
