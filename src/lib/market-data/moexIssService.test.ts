import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { convertMoexQuoteToUnitPrice } from "@/lib/market-data/moexIssService";

describe("moexIssService", () => {
  it("keeps share prices as a unit price", () => {
    expect(convertMoexQuoteToUnitPrice(new Decimal("320.26"), null, "shares").toString()).toBe("320.26");
  });

  it("converts bond percentage quotes to ruble unit price", () => {
    expect(convertMoexQuoteToUnitPrice(new Decimal("58.359"), new Decimal("1000"), "bonds").toFixed(2)).toBe("583.59");
  });
});
