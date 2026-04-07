"use strict";

import { createWorker } from "tesseract.js";

/**
 * Performs Optical Character Recognition (OCR) on an image and generates a
 * searchable PDF document from the result.
 * * @param {Uint8Array} image - The raw image data (e.g., from a screenshot) to be processed.
 * @param {string | undefined} presentation_name - The title to be embedded in the PDF metadata.
 * Defaults to "Result" if undefined.
 * * @returns {Promise<Uint8Array | undefined>} A promise that resolves to the binary data of the
 * generated PDF, or undefined if the PDF generation failed.
 * * @throws {Error} Throws errors related to Tesseract worker initialization or
 * engine-level recognition failures.
 */
export async function recognize(image: Uint8Array, presentation_name: string | undefined): Promise<Uint8Array | undefined> {
  const worker = await createWorker();
  try {
    const result = await worker.recognize(Buffer.from(image), { pdfTitle: presentation_name ?? "Result" }, { pdf: true });
    return result.data.pdf ? new Uint8Array(result.data.pdf) : undefined;
  } finally {
    await worker.terminate();
  }
}
