const lanterna = require('../src/index.js'); // replace with 'lanterna'

const url = 'https://docs.google.com/presentation/d/e/2PACX-1vSEfzYEyByG0NgYkP6uNPMOBy5EUoT2f0bQReydEHTf7kHSN1qcFUY9Bs1NSM5ZQOf2pflTWjm1QFsY/pub';

lanterna.scrape.download_presentation(url, 1920, 1080, './examples/output');