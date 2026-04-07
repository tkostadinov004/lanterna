"use strict";

import fs from "node:fs";
import fs_promises from "node:fs/promises";
import { PDFDocument, PDFPage } from "pdf-lib";

/**
 * Interface representing the result of a scraping operation.
 */
export interface ScrapeResult {
  /**
   * Saves the scrape result to the local file system.
   * @param {string} output_path - The file path or directory where the result should be saved.
   * @returns {Promise<void>}
   */
  save(output_path: string): Promise<void>;
}

/**
 * Represents a scrape result where all slides/pages are merged into a single PDF file.
 */
export class MergedScrapeResult implements ScrapeResult {
  private output_pdf: Uint8Array;

  /**
   * @param {Uint8Array} pdf - The binary data of the merged PDF.
   */
  public constructor(pdf: Uint8Array) {
    this.output_pdf = pdf;
  }

  /**
   * Saves the merged PDF to a specific file path, creating directories if they don't exist.
   * @param {string} output_path - The full system path (including filename) to save the PDF.
   * @returns {Promise<void>}
   * @throws {Error} Throws if file system permissions are denied or path is invalid.
   */
  public async save(output_path: string): Promise<void> {
    const dir = output_path.substring(0, output_path.lastIndexOf("/"));
    fs.mkdirSync(dir, { recursive: true });
    await fs_promises.writeFile(output_path, this.output_pdf);
  }

  /**
   * Breaks the merged PDF back down into individual pages.
   * @returns {Promise<PagedScrapeResult>} A promise resolving to a PagedScrapeResult containing individual PDF buffers.
   * @throws {Error} Throws if the PDF document is malformed or cannot be loaded.
   */
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

/**
 * Represents a scrape result where slides/pages are kept as a collection of individual PDF documents.
 */
export class PagedScrapeResult implements ScrapeResult {
  private pdf_documents: Uint8Array[];

  /**
   * @param {Uint8Array[]} pdf_documents - An array of binary PDF data, one for each page.
   */
  public constructor(pdf_documents: Uint8Array[]) {
    this.pdf_documents = pdf_documents;
  }

  /**
   * Internal helper to combine multiple PDFDocument instances into a single buffer.
   * @param {PDFDocument[]} pdfs - Array of loaded pdf-lib Document objects.
   * @returns {Promise<Uint8Array>} The merged PDF as binary data.
   * @private
   */
  private async merge_pdfs(pdfs: PDFDocument[]): Promise<Uint8Array> {
    const mergedPdf: PDFDocument = await PDFDocument.create();

    for (let document of pdfs) {
      const copiedPages: PDFPage[] = await mergedPdf.copyPages(document, document.getPageIndices());
      copiedPages.forEach((page) => mergedPdf.addPage(page));
    }

    return mergedPdf.save();
  }

  /**
   * Saves each page as a separate PDF file within the specified directory.
   * @param {string} output_dir - The directory where individual PDFs will be stored.
   * @returns {Promise<void>}
   * @throws {Error} Throws if directory creation or file writing fails.
   */
  public async save(output_dir: string): Promise<void> {
    fs.mkdirSync(output_dir, { recursive: true });
    if (!output_dir.endsWith("/")) {
      output_dir += "/";
    }
    for (let i = 0; i < this.pdf_documents.length; i++) {
      await fs_promises.writeFile(output_dir + `${i + 1}.pdf`, this.pdf_documents[i]);
    }
  }

  /**
   * Merges the individual pages into a single MergedScrapeResult.
   * @param {number[]} [order] - Optional array of indices to define a custom page order for the merge.
   * @returns {Promise<MergedScrapeResult>} A promise resolving to the merged PDF wrapper.
   * @throws {Error} Throws if indices are out of bounds or PDF loading fails.
   */
  public async merge(order?: number[]): Promise<MergedScrapeResult> {
    const indices: number[] = order ?? Array.from(Array(this.pdf_documents.length).keys());

    const pages: PDFDocument[] = await Promise.all(indices.map(async (index) => await PDFDocument.load(this.pdf_documents[index])));
    return new MergedScrapeResult(await this.merge_pdfs(pages));
  }
}
