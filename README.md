# Lanterna
<div align="center">
  <strong>Scrape published or embedded Google Slides presentations in any JavaScript environment.</strong>
</div>
<br/>
<div align="center">
  <!-- NPM Version -->
  <a href="https://www.npmjs.com/package/lanterna">
    <img
      src="https://img.shields.io/npm/v/lanterna.svg?style=flat-square"
      alt="NPM Version"
    />
  </a>
  <!-- Prettier Badge -->
  <a href="https://github.com/airbnb/javascript">
    <img
      src="https://badgen.net/badge/code%20style/airbnb/ff5a5f?icon=airbnb"
      alt="Prettier Badge"
    />
  </a>
</div> 

## Table of contents

<ul>
  <li><a href="#motivation">Idea and motivation</a></li>
  <li><a href="#installing">Installing</a></li>
  <li><a href="#local-setup">Local setup and tests</a></li>
</ul>

<div id="motivation"></div>

## Idea and motivation
Published or embedded Google Slides presentations are really hard (or even impossible) to download in an easy manner. That's exactly Lanterna's main purpose - to facilitate the process of downloading published or embedded presentations. </br> </br>
It works as follows: 
- full-page screenshots of the provided presentation are taken;
- the user may choose to save them as separate .pdf files or merge them into one .pdf file;
- optionally, the user may choose to enable OCR scanning of the presentation, making the output .pdf file(s) searchable

<div id="installing"></div>

## Installing
### NPM module
```
npm install lanterna
```
This assumes you're using npm as your package manager.

<div id="local-setup"></div>

## Local setup and tests
In order to work on `Lanterna`, please ensure you have installed the following:

- **Node.js** provides the runtime needed to run this project. ([Installation instructions](https://nodejs.org/en/download/) - `v20.0.0` or greater is needed).
- **NPM** is the package manager used for this project. ([Installation instructions](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm) - `v11.12.1` or greater is needed).
- **Git** is the SCM used for this project. ([Installation instructions](https://git-scm.com/downloads))

After doing that, you'll have to clone the project:

```
git clone https://github.com/tkostadinov004/lanterna.git
cd lanterna
```

After cloning the project, you have to install the dependencies (they are managed within the `package.json` file), so all you have to do is to run:

```
npm install
```

If you don't see any errors or warnings, then everything should have worked correctly. The next thing would be to [run the unit tests](#unit-tests) in order to verify that everything is working correctly.

<div id="unit-tests"></div>

### Unit Tests

We use [Jest](https://jestjs.io) to write unit tests for `Lanterna`. All unit tests are kept in the [`tests`](./tests) directory.

To run the unit tests, execute the following:

```
npm test
```

The output would look something like this:

```
npm test
> lanterna@1.0.0 test
> jest

 PASS  tests/ocr/ocr.test.ts
 PASS  tests/scrape/scrape.test.ts

Test Suites: 2 passed, 2 total
Tests:       7 passed, 7 total
Snapshots:   0 total
Time:        3.826 s
Ran all test suites.
```

Hopefully you see that all the tests passed! But if you see errors or warnings, then something must be wrong with your setup. Please ensure you've following the installation steps outlined in the [local setup and tests](#local-setup) section.
