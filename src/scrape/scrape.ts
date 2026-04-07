'use strict';

import { PDFDocument } from "pdf-lib";
import axios from "axios";
import puppeteer from "puppeteer";
import * as cheerio from "cheerio";

import { OutputOptions, ScrapeOptions } from "./options";
import { ScrapeResult, PagedScrapeResult } from "./scrape-result";
import * as ocr from "../ocr/ocr"

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

export async function scrape_presentation(presentation_url: string, 
        presentation_name: (string|undefined), 
        scrape_options: ScrapeOptions,
        output_options: OutputOptions) : Promise<ScrapeResult> {
    const page_ids = await fetch_page_ids(presentation_url);

    const page_width = scrape_options.page_width ?? 1280;
    const page_height = scrape_options.page_height ?? 720;
    const documents : Uint8Array[] = await Promise.all(page_ids.map(async id => {
        const url = presentation_url + `?slide=id.${id}`;
        const browser = await puppeteer
            .launch({
                defaultViewport: {
                    width: page_width,
                    height: page_height,
                },
            });
        const page = await browser.newPage();
        await page.goto(url);
        const screenshot_result = await page.screenshot({ type: 'webp', quality: 100 });
        await browser.close();
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
                height: page_height
            });
        }
        return await pdf_document.save();
    }));

    let result: PagedScrapeResult = new PagedScrapeResult(documents);
    return output_options.separate ? result : result.merge();
};