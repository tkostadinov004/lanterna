'use strict';

import fs from "node:fs";
import fs_promises from "node:fs/promises";

export class ScrapeResult {
    private output_pdf_document;
    public constructor(pdf: Uint8Array) {
        this.output_pdf_document = pdf;
    }
    public async save_to_file(output_path: string) {
        const dir = output_path.substring(0, output_path.lastIndexOf("/"));
        fs.mkdirSync(dir, {recursive: true});
        await fs_promises.writeFile(output_path, this.output_pdf_document);
    }
}