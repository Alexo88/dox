/* ═══════════════════════════════════════════
   Khipu Codex — Web Worker
   Convierte DOCX → HTML en hilo separado
   ═══════════════════════════════════════════ */

'use strict';

// Importar mammoth en el contexto del Worker
importScripts('lib/mammoth.browser.min.js');

/**
 * Listener principal del Worker.
 * Recibe un ArrayBuffer (Transferable) y devuelve HTML.
 */
self.onmessage = async function (e) {
    const arrayBuffer = e.data;

    try {
        // Convertir DOCX → HTML usando mammoth
        const result = await mammoth.convertToHtml(
            { arrayBuffer: arrayBuffer },
            {
                // Convertir imágenes embebidas a data URI base64
                convertImage: mammoth.images.imgElement(function (image) {
                    return image.read('base64').then(function (imageBuffer) {
                        return {
                            src: 'data:' + image.contentType + ';base64,' + imageBuffer
                        };
                    });
                })
            }
        );

        // Enviar resultado al hilo principal
        self.postMessage({
            type: 'success',
            html: result.value,
            messages: result.messages // Warnings de mammoth
        });

    } catch (err) {
        self.postMessage({
            type: 'error',
            error: err.message || 'Error procesando el documento'
        });
    }

    // El ArrayBuffer ya fue transferido (no se puede liberar explícitamente),
    // pero la referencia local se pierde al salir del handler
};
