"use strict";

import fs from "node:fs";
import fs_promises from "node:fs/promises";
import { PDFDocument, PDFPage } from "pdf-lib";

export interface ScrapeResult {
  save(output_path: string): Promise<void>;
}

export class MergedScrapeResult implements ScrapeResult {
  private output_pdf: Uint8Array;

  public constructor(pdf: Uint8Array) {
    this.output_pdf = pdf;
  }

  public async save(output_path: string): Promise<void> {
    const dir = output_path.substring(0, output_path.lastIndexOf("/"));
    fs.mkdirSync(dir, { recursive: true });
    await fs_promises.writeFile(output_path, this.output_pdf);
  }

  public async decompose(): Promise<PagedScrapeResult> {
    const document = await PDFDocument.load(this.output_pdf);
    const buffers: Uint8Array[] = await Promise.all(
      document.getPages().map(async (page) => {
        const curr = await PDFDocument.create();
        curr.addPage(page);
        return await curr.save();
      }),
    );

    return new PagedScrapeResult(buffers);
  }
}

export class PagedScrapeResult implements ScrapeResult {
  private pdf_documents: Uint8Array[];

  public constructor(pdf_documents: Uint8Array[]) {
    this.pdf_documents = pdf_documents;
  }

  private async merge_pdfs(pdfs: PDFDocument[]): Promise<Uint8Array> {
    const mergedPdf: PDFDocument = await PDFDocument.create();

    for (let document of pdfs) {
      const copiedPages: PDFPage[] = await mergedPdf.copyPages(document, document.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return mergedPdf.save();
  }

  public async save(output_dir: string): Promise<void> {
    fs.mkdirSync(output_dir, { recursive: true });
    if (!output_dir.endsWith("/")) {
      output_dir += "/";
    }
    for (let i = 0; i < this.pdf_documents.length; i++) {
      await fs_promises.writeFile(output_dir + `${i + 1}.pdf`, this.pdf_documents[i]);
    }
  }

  public async merge(order?: number[]): Promise<MergedScrapeResult> {
    const indices: number[] = order ?? Array.from(Array(this.pdf_documents).keys());

    const pages: PDFDocument[] = await Promise.all(indices.map(async (index) => await PDFDocument.load(this.pdf_documents[index])));
    return new MergedScrapeResult(await this.merge_pdfs(pages));
  }
}
