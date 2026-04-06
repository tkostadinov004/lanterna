import * as lanterna from "../src/index"

const url = 'https://docs.google.com/presentation/d/e/2PACX-1vSEfzYEyByG0NgYkP6uNPMOBy5EUoT2f0bQReydEHTf7kHSN1qcFUY9Bs1NSM5ZQOf2pflTWjm1QFsY/pub';

lanterna.scrape.scrape_presentation(url, {
    output_path: './examples/output/result.pdf',
    page_width: 1920,
    page_height: 1080
});