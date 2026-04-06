'use strict';

const fs = require('node:fs');
const fs_promises = require('node:fs/promises');

class ScrapeResult {
    output_pdf_document
    constructor(pdf) {
        this.output_pdf_document = pdf;
    }
    async save_to_file(output_path) {
        const dir = output_path.substring(0, output_path.lastIndexOf("/"));
        fs.mkdirSync(dir, {recursive: true});
        await fs_promises.writeFile(output_path, this.output_pdf_document);
    }
}

module.exports = ScrapeResult;