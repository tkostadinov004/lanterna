"use strict";

import { PDFDocument } from "pdf-lib";
import axios from "axios";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

import { OutputOptions, ScrapeOptions } from "./options";
import { ScrapeResult, PagedScrapeResult } from "./scrape-result";
import * as ocr from "../ocr/ocr";

/**
 * Fetches the internal slide IDs from a Google Slides presentation URL by parsing
 * the viewerData variable embedded in the page's script tags.
 * * @param {string} presentation_url - The base URL of the presentation to scrape.
 * @returns {Promise<string[]>} A promise that resolves to an array of slide ID strings.
 * @throws {Error} May throw errors related to network issues (axios) or script parsing failures.
 */
async function fetch_page_ids(presentation_url: string): Promise<string[]> {
  const res = await axios.get(presentation_url);
  const $ = cheerio.load(res.data);

  let result = new Array();
  $("script").each((_, el) => {
    const scriptContent = $(el).html();
    if (scriptContent == null) {
      return;
    }

    if (scriptContent.includes("var viewerData")) {
      const match = scriptContent.match(/var\s+viewerData\s*=\s*(\{[\s\S]*?\});/);
      if (match) {
        const data = eval("(" + match[1] + ")");
        data.docData[1].forEach((element: string[]) => result.push(element[0]));
      }
    }
  });
  return result;
}

/**
 * Scrapes a presentation by navigating to each slide, taking a screenshot,
 * and optionally performing OCR before compiling the results into PDF format.
 * * @param {string} presentation_url - The URL of the presentation.
 * @param {string | undefined} presentation_name - An optional name for the presentation (used for OCR context).
 * @param {ScrapeOptions} scrape_options - Configuration for scraping (dimensions, OCR toggle).
 * @param {OutputOptions} output_options - Configuration for output (whether to merge slides or keep them separate).
 * @returns {Promise<ScrapeResult>} A promise resolving to a ScrapeResult (either a single PDF or multiple pages).
 * @throws {Error} Throws "Invalid presentation url!" if no slide IDs are found,
 * or Puppeteer-related errors during navigation/rendering.
 */
export async function scrape_presentation(presentation_url: string, presentation_name: string | undefined, scrape_options: ScrapeOptions, output_options: OutputOptions): Promise<ScrapeResult> {
  const page_ids = await fetch_page_ids(presentation_url);
  if (page_ids.length == 0) {
    throw Error("Invalid presentation url!");
  }

  const page_width = scrape_options.page_width ?? 1280;
  const page_height = scrape_options.page_height ?? 720;
  const browser = await puppeteer.launch({
    defaultViewport: {
      width: page_width,
      height: page_height,
    },
  });

  const documents: Uint8Array[] = await Promise.all(
    page_ids.map(async (id) => {
      const url = presentation_url + `?slide=id.${id}`;
      const page = await browser.newPage();
      await page.goto(url);
      const screenshot_result = await page.screenshot({
        type: "webp",
        quality: 100,
      });

      const pdf_document = await PDFDocument.create();
      const pdf_page = pdf_document.addPage([page_width, page_height]);

      if (scrape_options.ocr) {
        const ocr_result = await ocr.recognize(screenshot_result, presentation_name);
        if (ocr_result) {
          return (await PDFDocument.load(ocr_result)).save();
        }
      } else {
        const png_image = await pdf_document.embedPng(screenshot_result);
        pdf_page.drawImage(png_image, {
          x: 0,
          y: 0,
          width: page_width,
          height: page_height,
        });
      }
      return await pdf_document.save();
    }),
  );
  await browser.close();

  let result: PagedScrapeResult = new PagedScrapeResult(documents);
  return output_options.separate ? result : result.merge();
}
