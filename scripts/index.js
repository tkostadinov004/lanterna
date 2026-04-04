'use strict';

/**
 * 
 * Build entry point for Lanterna.
 * @author Teodor Kostadinov <tkostadinov04@gmail.com>
 */
const scrape = require('./scrape/scrape.js');
const ocr = require('./ocr/ocr.js');

module.exports = {
    scrape,
    ocr
};