import { scrape_presentation } from "../../src/scrape/scrape";
import axios from "axios";
import puppeteer from "puppeteer";
import { PDFDocument } from "pdf-lib";
import { PagedScrapeResult } from "../../src/scrape/scrape-result";
import * as ocr from "../../src/ocr/ocr";

jest.mock("axios");
jest.mock("puppeteer");
jest.mock("../../src/ocr/ocr");

jest.mock("pdf-lib", () => {
  return {
    PDFDocument: {
      create: jest.fn().mockResolvedValue({
        addPage: jest.fn(),
        embedPng: jest.fn(),
        save: jest.fn(),
      }),
      load: jest.fn().mockResolvedValue({
        save: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
      }),
    },
  };
});

jest.mock("../../src/scrape/scrape-result", () => {
  return {
    PagedScrapeResult: jest.fn().mockImplementation((docs) => ({
      documents: docs,
      merge: jest.fn().mockReturnValue("mock-merged-result"),
    })),
  };
});

describe("scrape_presentation", () => {
  const mock_presentation_url = "https://example.com/presentation";
  const mock_presentation_name = "Test Presentation";

  let mock_page: any;
  let mock_browser: any;

  const mock_draw_image = jest.fn();
  const mock_embed_png = jest.fn().mockResolvedValue("mockPngObject");
  const mock_pdf_save = jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3]));
  const mock_add_page = jest.fn().mockReturnValue({ drawImage: mock_draw_image });

  const mock_load_pdf_doc = {
    save: jest.fn().mockResolvedValue(new Uint8Array([4, 5, 6])),
  };

  beforeEach(() => {
    jest.clearAllMocks();

    (PDFDocument.create as jest.Mock).mockResolvedValue({
      addPage: mock_add_page,
      embedPng: mock_embed_png,
      save: mock_pdf_save,
    });

    (PDFDocument.load as jest.Mock).mockResolvedValue({
      save: mock_load_pdf_doc.save,
    });

    const html_content = `
            <html>
                <body>
                    <script>
                        var viewerData = {
                            docData: [
                                "dummyData",
                                [
                                    ["page_id_1", "other"],
                                    ["page_id_2", "other"]
                                ]
                            ]
                        };
                    </script>
                </body>
            </html>
        `;
    (axios.get as jest.Mock).mockResolvedValue({ data: html_content });

    mock_page = {
      goto: jest.fn().mockResolvedValue(undefined),
      screenshot: jest.fn().mockResolvedValue(new Uint8Array([8, 9])), // dummy webp
    };
    mock_browser = {
      newPage: jest.fn().mockResolvedValue(mock_page),
      close: jest.fn().mockResolvedValue(undefined),
    };
    (puppeteer.launch as jest.Mock).mockResolvedValue(mock_browser);
  });

  it("should scrape successfully without OCR and merge the result", async () => {
    const result = await scrape_presentation(mock_presentation_url, mock_presentation_name, { page_width: 1000, page_height: 800, ocr: false }, { separate: false });

    expect(axios.get).toHaveBeenCalledWith(mock_presentation_url);
    expect(puppeteer.launch).toHaveBeenCalledTimes(1);

    expect(mock_page.goto).toHaveBeenCalledWith(`${mock_presentation_url}?slide=id.page_id_1`);
    expect(mock_page.screenshot).toHaveBeenCalledWith({
      type: "webp",
      quality: 100,
    });

    expect(PDFDocument.create).toHaveBeenCalledTimes(2);
    expect(mock_add_page).toHaveBeenCalledWith([1000, 800]);
    expect(mock_embed_png).toHaveBeenCalled();
    expect(mock_draw_image).toHaveBeenCalledWith("mockPngObject", {
      x: 0,
      y: 0,
      width: 1000,
      height: 800,
    });

    expect(PagedScrapeResult).toHaveBeenCalled();
    expect(result).toBe("mock-merged-result");
  });

  it("should scrape successfully with OCR and return separate documents", async () => {
    const dummy_ocr_result = new Uint8Array([10, 11, 12]);
    (ocr.recognize as jest.Mock).mockResolvedValue(dummy_ocr_result);

    await scrape_presentation(mock_presentation_url, mock_presentation_name, { ocr: true }, { separate: true });

    expect(ocr.recognize).toHaveBeenCalledTimes(2);

    expect(PDFDocument.load).toHaveBeenCalledWith(dummy_ocr_result);
    expect(mock_load_pdf_doc.save).toHaveBeenCalledTimes(2);
    expect(mock_embed_png).not.toHaveBeenCalled();

    expect(PagedScrapeResult).toHaveBeenCalled();
  });

  it("should handle missing script tag)", async () => {
    (axios.get as jest.Mock).mockResolvedValue({
      data: "<html><body>No scripts here</body></html>",
    });

    await expect(scrape_presentation(mock_presentation_url, undefined, { ocr: false }, { separate: false })).rejects.toThrow(Error);
  });
});
