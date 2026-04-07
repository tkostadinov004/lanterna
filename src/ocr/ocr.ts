"use strict";

import { createWorker } from "tesseract.js";

export async function recognize(
  image: Uint8Array,
  presentation_name: string | undefined,
): Promise<Uint8Array | undefined> {
  const worker = await createWorker();
  try {
    const result = await worker.recognize(
      Buffer.from(image),
      { pdfTitle: presentation_name ?? "Result" },
      { pdf: true },
    );
    return result.data.pdf ? new Uint8Array(result.data.pdf) : undefined;
  } finally {
    await worker.terminate();
  }
}
