/**
 * Khipu Codex — Build Script
 * Empaqueta todo en un unico archivo HTML portable.
 *
 * Uso: node build.js
 * Salida: KhipuCodex.html (todo incluido, 100% offline)
 */

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'KhipuCodex.html');

const STYLE_START = '<!-- DOCXLITE:STYLE_START -->';
const STYLE_END = '<!-- DOCXLITE:STYLE_END -->';
const MARKED_START = '<!-- DOCXLITE:MARKED_START -->';
const MARKED_END = '<!-- DOCXLITE:MARKED_END -->';
const SCRIPTS_START = '<!-- DOCXLITE:SCRIPTS_START -->';
const SCRIPTS_END = '<!-- DOCXLITE:SCRIPTS_END -->';

function replaceBlock(source, start, end, replacement) {
    const startIdx = source.indexOf(start);
    const endIdx = source.indexOf(end);
    if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
        throw new Error(`Missing build markers: ${start} ... ${end}`);
    }
    return source.slice(0, startIdx + start.length) + '\n' + replacement + '\n' + source.slice(endIdx);
}

console.log('\n  🔨 Khipu Codex Builder\n');

// ─── Leer archivos fuente ───
console.log('  → Leyendo archivos fuente...');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf-8');
const css = fs.readFileSync(path.join(ROOT, 'style.css'), 'utf-8');
const workerJs = fs.readFileSync(path.join(ROOT, 'docx.worker.js'), 'utf-8');
const mammoth = fs.readFileSync(path.join(ROOT, 'lib', 'mammoth.browser.min.js'), 'utf-8');

const markedSrc = fs.readFileSync(path.join(ROOT, 'lib', 'marked.min.js'), 'utf-8');

// ─── Leer módulos src/ — concatenados en orden de dependencias ───
const MODULE_ORDER = [
    'constants.js', 'dom-refs.js', 'theme.js', 'progress.js',
    'markdown.js', 'sectionizer.js', 'scroller.js', 'search.js',
    'tabs.js', 'annotation.js', 'svg-viewer.js', 'window.js', 'keyboard.js', 'file-handler.js', 'main.js'
];
const appJs = MODULE_ORDER.map(f =>
    fs.readFileSync(path.join(ROOT, 'src', f), 'utf-8')
).join('\n\n');

console.log(`     mammoth.js: ${(mammoth.length / 1024).toFixed(1)} KB`);
console.log(`     marked.js:  ${(markedSrc.length / 1024).toFixed(1)} KB`);
console.log(`     modules:    ${MODULE_ORDER.length} files`);
console.log(`     app.js:     ${(appJs.length / 1024).toFixed(1)} KB`);
console.log(`     worker.js:  ${(workerJs.length / 1024).toFixed(1)} KB`);
console.log(`     style.css:  ${(css.length / 1024).toFixed(1)} KB`);

// ─── Construir Worker con mammoth inlined ───
console.log('  → Inlineando mammoth.js en Worker...');
const workerSource = workerJs.replace(
    "importScripts('lib/mammoth.browser.min.js');",
    '// [mammoth.js inlined by build.js]\n' + mammoth
);

// ─── Modificar app.js para crear Worker desde Blob ───
console.log('  → Convirtiendo Worker a Blob inline...');
const workerBlobCode = `(function() {
    var workerCode = ${JSON.stringify(workerSource)};
    var blob = new Blob([workerCode], { type: 'application/javascript' });
    return new Worker(URL.createObjectURL(blob));
})()`;

const appJsModified = appJs.replace(
    /const createWorker = .*?; \/\/ DOCXLITE_WORKER/,
    `const createWorker = () => ${workerBlobCode}; // DOCXLITE_WORKER`
);

// ─── Ensamblar HTML final ───
console.log('  → Ensamblando HTML portable...');
let output = html;

// 1. Inline CSS dentro de los marcadores
const styleBlock = '<style>\n' + css + '\n    </style>';
output = replaceBlock(output, STYLE_START, STYLE_END, styleBlock);

// 2. Inline scripts (marked.js + app.js) dentro de los marcadores
// Prepend marked source so it's available before app.js
const scriptBlock = '<script>\n' + markedSrc + '\n    </script>\n    <script>\n' + appJsModified + '\n    </script>';
output = replaceBlock(output, SCRIPTS_START, SCRIPTS_END, scriptBlock);

// ─── Escribir archivo de salida ───
// 1. KhipuCodex.html (portable standalone)
fs.writeFileSync(OUT, output, 'utf-8');

// 2. public/index.html (para Tauri - mismo contenido embebido)
const PUBLIC_DIR = path.join(ROOT, 'public');
if (!fs.existsSync(PUBLIC_DIR)) fs.mkdirSync(PUBLIC_DIR, { recursive: true });
const TAURI_OUT = path.join(PUBLIC_DIR, 'index.html');
fs.writeFileSync(TAURI_OUT, output, 'utf-8');

// Copiar favicon para Tauri
const FAVICON_SRC = path.join(ROOT, 'src-tauri', 'icons', 'icon.ico');
const FAVICON_DST = path.join(PUBLIC_DIR, 'favicon.ico');
if (fs.existsSync(FAVICON_SRC) && !fs.existsSync(FAVICON_DST)) {
    fs.copyFileSync(FAVICON_SRC, FAVICON_DST);
    console.log('  → Copiado favicon.ico a public/');
}

const sizeKB = (fs.statSync(OUT).size / 1024).toFixed(1);
const sizeMB = (fs.statSync(OUT).size / (1024 * 1024)).toFixed(2);

console.log(`\n  ✅ Build exitoso!`);
console.log(`  📄 KhipuCodex.html (${sizeKB} KB / ${sizeMB} MB)`);
console.log(`  📁 ${OUT}`);
console.log(`  📁 ${TAURI_OUT} (Tauri)`);
console.log(`\n  → Abrí KhipuCodex.html en cualquier navegador. No necesita servidor.`);
console.log(`  → O ejecutá "dx" para lanzar la versión nativa.\n`);
