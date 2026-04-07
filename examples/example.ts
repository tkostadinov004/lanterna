import * as lanterna from "../src/index"
import { ScrapeResult } from "../src/scrape/scrape-result";

async function scrape_and_save_separately() {
    const url = 'https://docs.google.com/presentation/d/e/2PACX-1vSEfzYEyByG0NgYkP6uNPMOBy5EUoT2f0bQReydEHTf7kHSN1qcFUY9Bs1NSM5ZQOf2pflTWjm1QFsY/pub';
    const result: ScrapeResult = await lanterna.scrape.scrape_presentation(url, 'Example presentation', {
        page_width: 1920,
        page_height: 1080,
        ocr: true
    }, {
        separate: true
    });
    await result.save('./examples/output/');
}

scrape_and_save_separately();