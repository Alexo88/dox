/* Khipu Codex — src/markdown.js */

'use strict';

function saveMarkdownVersion(name, text) {
    if (!name) return;
    const key = `khipu-md:${name}`;
    let versions = [];
    try {
        versions = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (err) {
        versions = [];
    }

    const last = versions.length ? versions[versions.length - 1] : null;
    if (last && last.text === text) return;

    versions.push({ ts: Date.now(), text });

    // Límite por cantidad
    if (versions.length > MARKDOWN_VERSION_LIMIT) {
        versions = versions.slice(-MARKDOWN_VERSION_LIMIT);
    }

    // Límite por peso (~400KB máx)
    const MAX_STORAGE_BYTES = 400 * 1024;
    let serialized = JSON.stringify(versions);
    while (serialized.length > MAX_STORAGE_BYTES && versions.length > 1) {
        versions.shift();
        serialized = JSON.stringify(versions);
    }

    try {
        localStorage.setItem(key, serialized);
    } catch (err) {
        console.warn('[Khipu] localStorage lleno — versión no guardada para:', name);
    }
}
