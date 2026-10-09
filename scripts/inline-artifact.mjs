// Builds a single self-contained HTML page from dist/ for sharing as a preview.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const dist = 'dist';
const html = readFileSync(join(dist, 'index.html'), 'utf8');
const js = html.match(/<script type="module" crossorigin src="\.\/(assets\/[^"]+\.js)"><\/script>/)?.[1];
const css = html.match(/<link rel="stylesheet" crossorigin href="\.\/(assets\/[^"]+\.css)">/)?.[1];
if (!js || !css) throw new Error('Could not find built assets in dist/index.html. Run npm run build first.');

const script = readFileSync(join(dist, js), 'utf8').replace(/<\/script/gi, '<\\/script');
const style = readFileSync(join(dist, css), 'utf8');
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]+>/)?.[0] ?? '';

const page = `<title>igo trip planner</title>
${fonts}
<style>${style}</style>
<div id="root"></div>
<script type="module">${script}</script>
`;
mkdirSync('artifact', { recursive: true });
writeFileSync(join('artifact', 'igo.html'), page);
console.log(`artifact/igo.html ${(page.length / 1024).toFixed(0)} KB`);
