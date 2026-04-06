'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const pdf = require('pdf-lib');
const ScrapeResult = require('./scrape-result');

async function merge_pdfs(pdfs) {
    const mergedPdf = await pdf.PDFDocument.create();

	for (let document of pdfs) {
		const copiedPages = await mergedPdf.copyPages(document, document.getPageIndices());
		copiedPages.forEach((page) => mergedPdf.addPage(page));    
	}
	
	return await mergedPdf.save();
}

async function fetch_page_ids(presentation_url) {
    const res = await axios.get(presentation_url);
    const $ = cheerio.load(res.data);

    let result = new Array();
    $("script").each((i, el) => {
        const scriptContent = $(el).html();
        if (scriptContent.includes("var viewerData")) {
            const match = scriptContent.match(/var\s+viewerData\s*=\s*(\{[\s\S]*?\});/);
            if (match) {
                const data = eval("(" + match[1] + ")");
                data.docData[1].forEach(element => {
                    result.push(element[0]);
                });
            }
        }
    });
    return result;
}

const download_presentation = async function(presentation_url, options) {
    const page_ids = await fetch_page_ids(presentation_url);
    const documents = await Promise.all(page_ids.map(id => {
        const url = presentation_url + `?slide=id.${id}`;
        return puppeteer
            .launch({
                defaultViewport: {
                    width: options.page_width,
                    height: options.page_height,
                },
            })
            .then(async (browser) => {
                const page = await browser.newPage();
                await page.goto(url);

                const screenshot_result = await page.screenshot();
                const pdf_document = await pdf.PDFDocument.create();
                const pdf_page = pdf_document.addPage([options.page_width, options.page_height]);
                const png_image = await pdf_document.embedPng(screenshot_result);
                pdf_page.drawImage(png_image, {
                    x: 0, 
                    y: 0,
                    width: options.page_width,
                    height: options.page_height
                });
                await browser.close();
                return pdf_document;
            })
            .catch(err => console.error(err));
    }));
    const merged_result = await merge_pdfs(documents);
    const result = new ScrapeResult(merged_result);

    if (options.output_path) {
        result.save_to_file(options.output_path);
    }
    return result;
};

module.exports = {
    download_presentation
};