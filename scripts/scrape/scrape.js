'use strict';

const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const fs = require('node:fs');

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
    for (let i = 0; i < page_ids.length; i++) {
        const url = presentation_url + `?slide=id.${page_ids[i]}`;
        puppeteer
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
                await page.screenshot({ path: output_dir + `/res-${i + 1}.png` });
                await browser.close();
            })
            .catch(err => console.error(err));
    }
};

module.exports = {
    download_presentation
};