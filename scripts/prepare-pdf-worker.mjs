import { copyFileSync } from 'node:fs';

// Serve the worker from the same origin with the exact installed pdf.js version.
copyFileSync(new URL('../node_modules/pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url), new URL('../public/pdf.worker.min.mjs', import.meta.url));
