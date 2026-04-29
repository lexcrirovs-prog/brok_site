import type { ParserInput, ParseResult, ReportParser } from "@/lib/import/parsers/types";
import { GenericPdfParser } from "@/lib/import/parsers/genericPdfParser";
import { parseCsv, parseXlsx } from "@/lib/import/parsers/tabularParser";

abstract class BrokerParser implements ReportParser {
  abstract name: string;
  abstract brokerType: "TBANK" | "SBER" | "VTB";
  private pdfParser = new GenericPdfParser();

  supports(fileType: string, fileName: string): boolean {
    return (
      ["text/csv", "application/pdf", "application/vnd.ms-excel"].includes(fileType) ||
      /\.(csv|xlsx|pdf)$/i.test(fileName)
    );
  }

  async parse(input: ParserInput): Promise<ParseResult> {
    if (/\.csv$/i.test(input.fileName)) {
      return parseCsv(input.buffer);
    }

    if (/\.xlsx$/i.test(input.fileName)) {
      return parseXlsx(input.buffer);
    }

    return this.pdfParser.parse(input);
  }
}

export class TBankParser extends BrokerParser {
  name = "TBankParser";
  brokerType = "TBANK" as const;
}

export class SberParser extends BrokerParser {
  name = "SberParser";
  brokerType = "SBER" as const;
}

export class VtbParser extends BrokerParser {
  name = "VtbParser";
  brokerType = "VTB" as const;
}
