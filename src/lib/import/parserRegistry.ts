import type { BrokerType } from "@prisma/client";
import { TBankParser, SberParser, VtbParser } from "@/lib/import/parsers/brokerParsers";
import { GenericCsvParser } from "@/lib/import/parsers/genericCsvParser";
import { GenericPdfParser } from "@/lib/import/parsers/genericPdfParser";
import type { ReportParser } from "@/lib/import/parsers/types";

const parsers: ReportParser[] = [
  new TBankParser(),
  new SberParser(),
  new VtbParser(),
  new GenericCsvParser(),
  new GenericPdfParser(),
];

export function getParser(brokerType: BrokerType, fileType: string, fileName: string): ReportParser {
  const brokerParser = parsers.find(
    (parser) => parser.brokerType === brokerType && parser.supports(fileType, fileName),
  );

  if (brokerParser) {
    return brokerParser;
  }

  const generic = parsers.find((parser) => parser.brokerType === "OTHER" && parser.supports(fileType, fileName));
  if (!generic) {
    throw new Error("Формат файла не поддерживается");
  }

  return generic;
}
