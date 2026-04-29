import type { ParserInput, ParseResult, ReportParser } from "@/lib/import/parsers/types";

export class GenericPdfParser implements ReportParser {
  name = "GenericPdfParser";
  brokerType = "OTHER" as const;

  supports(fileType: string, fileName: string): boolean {
    return fileType === "application/pdf" || /\.pdf$/i.test(fileName);
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    try {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(input.buffer) });
      const text = await parser.getText();
      await parser.destroy();

      const lines = text.text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      return {
        status: "needs_review",
        transactions: [],
        rawRows: lines.map((line, index) => ({ line: index + 1, text: line })),
        warnings: ["PDF распознан как сырой текст. Нужна ручная сверка или адаптер под конкретный формат отчета."],
      };
    } catch (error) {
      return {
        status: "error",
        transactions: [],
        rawRows: [],
        warnings: [],
        errorMessage: error instanceof Error ? error.message : "Не удалось прочитать PDF",
      };
    }
  }
}
