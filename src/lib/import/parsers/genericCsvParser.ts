import type { ParserInput, ParseResult, ReportParser } from "@/lib/import/parsers/types";
import { parseCsv, parseXlsx } from "@/lib/import/parsers/tabularParser";

export class GenericCsvParser implements ReportParser {
  name = "GenericCsvParser";
  brokerType = "OTHER" as const;

  supports(fileType: string, fileName: string): boolean {
    return ["text/csv", "application/vnd.ms-excel"].includes(fileType) || /\.(csv|xlsx)$/i.test(fileName);
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    if (/\.xlsx$/i.test(input.fileName)) {
      return parseXlsx(input.buffer);
    }

    return parseCsv(input.buffer);
  }
}
