'use strict';

import { Browser } from "puppeteer";
import { PDFDocument } from "pdf-lib";
import axios from "axios";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

import { ScrapeOptions } from "./scrape-options";
import { ScrapeResult } from "./scrape-result";

async function merge_pdfs(pdfs: PDFDocument[]): Promise<Uint8Array> {
    const mergedPdf = await PDFDocument.create();

	for (let document of pdfs) {
		const copiedPages = await mergedPdf.copyPages(document, document.getPageIndices());
		copiedPages.forEach((page) => mergedPdf.addPage(page));    
	}
	
	return mergedPdf.save();
}

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

export async function scrape_presentation(presentation_url: string, options: ScrapeOptions) : Promise<ScrapeResult> {
    const page_ids = await fetch_page_ids(presentation_url);

    const page_width = options.page_width ?? 1280;
    const page_height = options.page_height ?? 720;
    const documents = await Promise.all(page_ids.map(id => {
        const url = presentation_url + `?slide=id.${id}`;
        return puppeteer
            .launch({
                defaultViewport: {
                    width: page_width,
                    height: page_height,
                },
            })
            .then(async (browser: Browser) => {
                const page = await browser.newPage();
                await page.goto(url);

                const screenshot_result = await page.screenshot();
                const pdf_document = await PDFDocument.create();
                const pdf_page = pdf_document.addPage([page_width, page_height]);
                const png_image = await pdf_document.embedPng(screenshot_result);
                pdf_page.drawImage(png_image, {
                    x: 0, 
                    y: 0,
                    width: options.page_width,
                    height: options.page_height
                });
                await browser.close();
                return pdf_document;
            });
    }));
    const merged_result: Uint8Array = await merge_pdfs(documents);
    const result = new ScrapeResult(merged_result);

    if (options.output_path) {
        await result.save_to_file(options.output_path);
    }
    return result;
};