'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('node:fs');
const fs_promises = require('node:fs/promises');
const pdf = require('pdf-lib');

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

const download_presentation = async function(presentation_url, page_width, page_height, output_dir) {
    const page_ids = await fetch_page_ids(presentation_url);
    const documents = await Promise.all(page_ids.map(id => {
        const url = presentation_url + `?slide=id.${id}`;
        return puppeteer
            .launch({
                defaultViewport: {
                    width: page_width,
                    height: page_height,
                },
            })
            .then(async (browser) => {
                const page = await browser.newPage();
                await page.goto(url);

                fs.mkdirSync(output_dir, {recursive: true});
                const screenshot_result = await page.screenshot();
                const pdf_document = await pdf.PDFDocument.create();
                const pdf_page = pdf_document.addPage([page_width, page_height]);
                const png_image = await pdf_document.embedPng(screenshot_result);
                pdf_page.drawImage(png_image, {
                    x: 0, 
                    y: 0,
                    width: page_width,
                    height: page_height
                });
                await browser.close();
                return pdf_document;
            })
            .catch(err => console.error(err));
    }));
    const merged_result = await merge_pdfs(documents);
    await fs_promises.writeFile(output_dir + `/result.pdf`, merged_result);
};

module.exports = {
    download_presentation
};