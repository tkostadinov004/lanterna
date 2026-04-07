import { recognize } from "../../src/ocr/ocr";
import { createWorker } from "tesseract.js";

jest.mock("tesseract.js", () => ({
  createWorker: jest.fn(),
}));

describe("ocr_recognize", () => {
  const mock_image = new Uint8Array([10, 20, 30]);
  const mock_pdf_data = [1, 2, 3];

  const mock_recognize = jest.fn();
  const mock_terminate = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (createWorker as jest.Mock).mockResolvedValue({
      recognize: mock_recognize,
      terminate: mock_terminate,
    });
  });

  it("should return a Uint8Array when PDF data is present", async () => {
    mock_recognize.mockResolvedValue({
      data: {
        pdf: mock_pdf_data,
      },
    });

    const result = await recognize(mock_image, "Test Presentation");

    expect(createWorker).toHaveBeenCalled();
    expect(mock_recognize).toHaveBeenCalledWith(
      expect.any(Buffer),
      { pdfTitle: "Test Presentation" },
      { pdf: true },
    );

    expect(result).toBeInstanceOf(Uint8Array);
    expect(Array.from(result!)).toEqual(mock_pdf_data);

    expect(mock_terminate).toHaveBeenCalled();
  });

  it('should use "Result" as default title if presentation_name is undefined', async () => {
    mock_recognize.mockResolvedValue({ data: { pdf: mock_pdf_data } });

    await recognize(mock_image, undefined);

    expect(mock_recognize).toHaveBeenCalledWith(
      expect.any(Buffer),
      { pdfTitle: "Result" },
      { pdf: true },
    );
  });

  it("should return undefined if tesseract does not produce a pdf field", async () => {
    mock_recognize.mockResolvedValue({
      data: { text: "some text but no pdf" },
    });

    const result = await recognize(mock_image, "Title");

    expect(result).toBeUndefined();
    expect(mock_terminate).toHaveBeenCalled();
  });

  it("should terminate the worker even if recognize throws an error", async () => {
    mock_recognize.mockRejectedValue(new Error("Tesseract Failed"));

    await expect(recognize(mock_image, "Title")).rejects.toThrow(
      "Tesseract Failed",
    );

    expect(mock_terminate).toHaveBeenCalled();
  });
});
