import Decimal from "decimal.js";
import { prisma } from "@/lib/prisma";
import { getDaysInPeriod, isWithinPeriod, monthKey, type Period } from "@/lib/period";
import { toDecimal } from "@/lib/format";

export type AnalyticsTransaction = {
  id: string;
  accountId: string;
  accountName?: string;
  brokerId: string;
  brokerName: string;
  instrumentId?: string | null;
  instrumentTicker?: string | null;
  instrumentName?: string | null;
  instrumentType?: string | null;
  currentPrice?: Decimal.Value | null;
  date: Date;
  operationType: string;
  quantity: Decimal.Value;
  price: Decimal.Value;
  amountGross: Decimal.Value;
  taxAmount: Decimal.Value;
  commissionAmount: Decimal.Value;
  amountNet: Decimal.Value;
  accruedInterest?: Decimal.Value;
  currency: string;
};

export type AnalyticsInput = {
  transactions: AnalyticsTransaction[];
};

export type PositionLot = {
  accountId: string;
  brokerId: string;
  instrumentId: string;
  instrumentTicker: string;
  instrumentName: string;
  instrumentType: string;
  currency: string;
  quantity: Decimal;
  averagePrice: Decimal;
  marketPrice: Decimal;
  marketValue: Decimal;
  unrealizedProfit: Decimal;
};

export type MonthlyAnalytics = {
  month: string;
  profit: Decimal;
  dividends: Decimal;
  coupons: Decimal;
  taxes: Decimal;
  commissions: Decimal;
};

const buyOps = new Set(["BUY"]);
const sellOps = new Set(["SELL", "BOND_REDEMPTION"]);
const incomeOps = new Set(["DIVIDEND", "COUPON"]);
const expenseOps = new Set(["TAX", "COMMISSION", "BROKER_FEE"]);

function op(value: string): string {
  return value.toUpperCase();
}

function signedCashEffect(transaction: AnalyticsTransaction): Decimal {
  const operationType = op(transaction.operationType);
  const gross = toDecimal(transaction.amountGross);
  const net = toDecimal(transaction.amountNet);
  const tax = toDecimal(transaction.taxAmount);
  const commission = toDecimal(transaction.commissionAmount);
  const accruedInterest = toDecimal(transaction.accruedInterest);

  if (operationType === "BUY") {
    return gross.plus(commission).plus(accruedInterest).neg();
  }

  if (operationType === "SELL" || operationType === "BOND_REDEMPTION") {
    return gross.minus(tax).minus(commission);
  }

  if (incomeOps.has(operationType)) {
    return gross.minus(tax);
  }

  if (operationType === "DEPOSIT") {
    return net.isZero() ? gross : net;
  }

  if (operationType === "WITHDRAWAL") {
    return (net.isZero() ? gross : net).neg();
  }

  if (expenseOps.has(operationType)) {
    return gross.plus(tax).plus(commission).neg();
  }

  return net;
}

function transactionsUpTo(input: AnalyticsInput, date: Date): AnalyticsTransaction[] {
  return input.transactions
    .filter((transaction) => transaction.date.getTime() <= date.getTime())
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

function periodTransactions(input: AnalyticsInput, period: Period): AnalyticsTransaction[] {
  return input.transactions.filter((transaction) => isWithinPeriod(transaction.date, period));
}

function buildPositions(input: AnalyticsInput, period: Period): PositionLot[] {
  const lots = new Map<
    string,
    {
      accountId: string;
      brokerId: string;
      instrumentId: string;
      instrumentTicker: string;
      instrumentName: string;
      instrumentType: string;
      currency: string;
      quantity: Decimal;
      cost: Decimal;
      marketPrice: Decimal;
    }
  >();

  for (const transaction of transactionsUpTo(input, period.endDate)) {
    if (!transaction.instrumentId) {
      continue;
    }

    const operationType = op(transaction.operationType);
    if (!buyOps.has(operationType) && !sellOps.has(operationType)) {
      continue;
    }

    const key = `${transaction.accountId}:${transaction.instrumentId}`;
    const existing =
      lots.get(key) ??
      {
        accountId: transaction.accountId,
        brokerId: transaction.brokerId,
        instrumentId: transaction.instrumentId,
        instrumentTicker: transaction.instrumentTicker ?? "N/A",
        instrumentName: transaction.instrumentName ?? "Инструмент",
        instrumentType: transaction.instrumentType ?? "OTHER",
        currency: transaction.currency,
        quantity: new Decimal(0),
        cost: new Decimal(0),
        marketPrice: toDecimal(transaction.currentPrice ?? transaction.price),
      };

    const quantity = toDecimal(transaction.quantity).abs();
    const gross = toDecimal(transaction.amountGross);
    const accruedInterest = toDecimal(transaction.accruedInterest);

    if (operationType === "BUY") {
      existing.quantity = existing.quantity.plus(quantity);
      existing.cost = existing.cost.plus(gross).plus(accruedInterest);
      existing.marketPrice = toDecimal(transaction.currentPrice ?? transaction.price);
    } else {
      const average = existing.quantity.isZero()
        ? new Decimal(0)
        : existing.cost.div(existing.quantity);
      const soldQuantity = Decimal.min(quantity, existing.quantity);
      existing.quantity = existing.quantity.minus(soldQuantity);
      existing.cost = Decimal.max(0, existing.cost.minus(average.mul(soldQuantity)));
      existing.marketPrice = toDecimal(transaction.currentPrice ?? transaction.price);
    }

    lots.set(key, existing);
  }

  return [...lots.values()]
    .filter((lot) => lot.quantity.gt(0))
    .map((lot) => {
      const averagePrice = lot.quantity.isZero() ? new Decimal(0) : lot.cost.div(lot.quantity);
      const marketValue = lot.quantity.mul(lot.marketPrice);
      return {
        accountId: lot.accountId,
        brokerId: lot.brokerId,
        instrumentId: lot.instrumentId,
        instrumentTicker: lot.instrumentTicker,
        instrumentName: lot.instrumentName,
        instrumentType: lot.instrumentType,
        currency: lot.currency,
        quantity: lot.quantity,
        averagePrice,
        marketPrice: lot.marketPrice,
        marketValue,
        unrealizedProfit: marketValue.minus(lot.cost),
      };
    });
}

export function calculatePositions(input: AnalyticsInput, period: Period): PositionLot[] {
  return buildPositions(input, period);
}

function calculateCashBalance(input: AnalyticsInput, period: Period, brokerId?: string): Decimal {
  return transactionsUpTo(input, period.endDate).reduce((sum, transaction) => {
    if (brokerId && transaction.brokerId !== brokerId) {
      return sum;
    }

    return sum.plus(signedCashEffect(transaction));
  }, new Decimal(0));
}

export function calculatePortfolioValue(input: AnalyticsInput, period: Period): Decimal {
  const positionsValue = buildPositions(input, period).reduce(
    (sum, position) => sum.plus(position.marketValue),
    new Decimal(0),
  );

  return positionsValue.plus(calculateCashBalance(input, period));
}

export function calculateTaxes(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period).reduce((sum, transaction) => {
    const directTax = op(transaction.operationType) === "TAX" ? toDecimal(transaction.amountGross) : new Decimal(0);
    return sum.plus(toDecimal(transaction.taxAmount)).plus(directTax);
  }, new Decimal(0));
}

export function calculateCommissions(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period).reduce((sum, transaction) => {
    const directFee = ["COMMISSION", "BROKER_FEE"].includes(op(transaction.operationType))
      ? toDecimal(transaction.amountGross)
      : new Decimal(0);
    return sum.plus(toDecimal(transaction.commissionAmount)).plus(directFee);
  }, new Decimal(0));
}

export function calculateDividendsGross(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period)
    .filter((transaction) => op(transaction.operationType) === "DIVIDEND")
    .reduce((sum, transaction) => sum.plus(toDecimal(transaction.amountGross)), new Decimal(0));
}

export function calculateDividendsNet(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period)
    .filter((transaction) => op(transaction.operationType) === "DIVIDEND")
    .reduce((sum, transaction) => sum.plus(toDecimal(transaction.amountGross).minus(transaction.taxAmount)), new Decimal(0));
}

export function calculateCouponsGross(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period)
    .filter((transaction) => op(transaction.operationType) === "COUPON")
    .reduce((sum, transaction) => sum.plus(toDecimal(transaction.amountGross)), new Decimal(0));
}

export function calculateCouponsNet(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period)
    .filter((transaction) => op(transaction.operationType) === "COUPON")
    .reduce((sum, transaction) => sum.plus(toDecimal(transaction.amountGross).minus(transaction.taxAmount)), new Decimal(0));
}

export function calculateRealizedProfit(input: AnalyticsInput, period: Period): Decimal {
  const lots = new Map<string, { quantity: Decimal; cost: Decimal }>();
  let realized = new Decimal(0);

  for (const transaction of transactionsUpTo(input, period.endDate)) {
    if (!transaction.instrumentId) {
      continue;
    }

    const operationType = op(transaction.operationType);
    if (!buyOps.has(operationType) && !sellOps.has(operationType)) {
      continue;
    }

    const key = `${transaction.accountId}:${transaction.instrumentId}`;
    const lot = lots.get(key) ?? { quantity: new Decimal(0), cost: new Decimal(0) };
    const quantity = toDecimal(transaction.quantity).abs();

    if (operationType === "BUY") {
      lot.quantity = lot.quantity.plus(quantity);
      lot.cost = lot.cost
        .plus(transaction.amountGross)
        .plus(transaction.accruedInterest ?? 0);
      lots.set(key, lot);
      continue;
    }

    const averageCost = lot.quantity.isZero() ? new Decimal(0) : lot.cost.div(lot.quantity);
    const soldQuantity = Decimal.min(quantity, lot.quantity);
    const costSold = averageCost.mul(soldQuantity);
    const grossResult = toDecimal(transaction.amountGross).minus(costSold);

    if (isWithinPeriod(transaction.date, period)) {
      realized = realized.plus(grossResult);
    }

    lot.quantity = lot.quantity.minus(soldQuantity);
    lot.cost = Decimal.max(0, lot.cost.minus(costSold));
    lots.set(key, lot);
  }

  return realized;
}

export function calculateUnrealizedProfit(input: AnalyticsInput, period: Period): Decimal {
  return buildPositions(input, period).reduce(
    (sum, position) => sum.plus(position.unrealizedProfit),
    new Decimal(0),
  );
}

export function calculateProfitWithDividends(input: AnalyticsInput, period: Period): Decimal {
  return calculateRealizedProfit(input, period)
    .plus(calculateUnrealizedProfit(input, period))
    .plus(calculateDividendsGross(input, period))
    .plus(calculateCouponsGross(input, period));
}

export function calculateProfitWithoutDividends(input: AnalyticsInput, period: Period): Decimal {
  return calculateRealizedProfit(input, period)
    .plus(calculateUnrealizedProfit(input, period))
    .plus(calculateCouponsGross(input, period));
}

export function calculateProfitWithCoupons(input: AnalyticsInput, period: Period): Decimal {
  return calculateRealizedProfit(input, period)
    .plus(calculateUnrealizedProfit(input, period))
    .plus(calculateDividendsGross(input, period))
    .plus(calculateCouponsGross(input, period));
}

export function calculateProfitWithoutCoupons(input: AnalyticsInput, period: Period): Decimal {
  return calculateRealizedProfit(input, period)
    .plus(calculateUnrealizedProfit(input, period))
    .plus(calculateDividendsGross(input, period));
}

export function calculateGrossProfit(input: AnalyticsInput, period: Period): Decimal {
  return calculateProfitWithDividends(input, period);
}

export function calculateNetProfit(input: AnalyticsInput, period: Period): Decimal {
  return calculateGrossProfit(input, period)
    .minus(calculateTaxes(input, period))
    .minus(calculateCommissions(input, period));
}

export function calculateDeposits(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period)
    .filter((transaction) => op(transaction.operationType) === "DEPOSIT")
    .reduce((sum, transaction) => sum.plus(toDecimal(transaction.amountNet).isZero() ? transaction.amountGross : transaction.amountNet), new Decimal(0));
}

export function calculateWithdrawals(input: AnalyticsInput, period: Period): Decimal {
  return periodTransactions(input, period)
    .filter((transaction) => op(transaction.operationType) === "WITHDRAWAL")
    .reduce((sum, transaction) => sum.plus(toDecimal(transaction.amountNet).isZero() ? transaction.amountGross : transaction.amountNet), new Decimal(0));
}

export function calculateCashflows(input: AnalyticsInput, period: Period): { date: Date; amount: Decimal; label: string }[] {
  const flows = periodTransactions(input, period)
    .filter((transaction) => ["DEPOSIT", "WITHDRAWAL"].includes(op(transaction.operationType)))
    .map((transaction) => ({
      date: transaction.date,
      amount:
        op(transaction.operationType) === "DEPOSIT"
          ? toDecimal(transaction.amountNet).isZero()
            ? toDecimal(transaction.amountGross).neg()
            : toDecimal(transaction.amountNet).neg()
          : toDecimal(transaction.amountNet).isZero()
            ? toDecimal(transaction.amountGross)
            : toDecimal(transaction.amountNet),
      label: op(transaction.operationType) === "DEPOSIT" ? "Пополнение" : "Вывод",
    }));

  const endingValue = calculatePortfolioValue(input, period);
  if (!endingValue.isZero()) {
    flows.push({ date: period.endDate, amount: endingValue, label: "Стоимость портфеля" });
  }

  return flows;
}

export function calculateXirr(input: AnalyticsInput, period: Period): Decimal | null {
  const flows = calculateCashflows(input, period);
  const hasPositive = flows.some((flow) => flow.amount.gt(0));
  const hasNegative = flows.some((flow) => flow.amount.lt(0));

  if (!hasPositive || !hasNegative) {
    return null;
  }

  const firstDate = flows[0].date.getTime();
  let rate = new Decimal(0.1);

  for (let i = 0; i < 60; i += 1) {
    let value = new Decimal(0);
    let derivative = new Decimal(0);

    for (const flow of flows) {
      const years = new Decimal(flow.date.getTime() - firstDate).div(365 * 24 * 60 * 60 * 1000);
      const base = rate.plus(1);
      if (base.lte(0)) {
        return null;
      }

      const factor = Decimal.pow(base, years);
      value = value.plus(flow.amount.div(factor));
      derivative = derivative.minus(years.mul(flow.amount).div(Decimal.pow(base, years.plus(1))));
    }

    if (derivative.abs().lt("0.0000001")) {
      return null;
    }

    const nextRate = rate.minus(value.div(derivative));
    if (nextRate.minus(rate).abs().lt("0.0000001")) {
      return nextRate;
    }

    rate = nextRate;
  }

  return rate;
}

export function calculateBrokerBreakdown(input: AnalyticsInput, period: Period) {
  const brokers = new Map<
    string,
    {
      brokerId: string;
      brokerName: string;
      value: Decimal;
      profit: Decimal;
      commissions: Decimal;
      taxes: Decimal;
      instruments: Set<string>;
      lastImport?: Date;
    }
  >();

  for (const transaction of input.transactions) {
    const record =
      brokers.get(transaction.brokerId) ??
      {
        brokerId: transaction.brokerId,
        brokerName: transaction.brokerName,
        value: new Decimal(0),
        profit: new Decimal(0),
        commissions: new Decimal(0),
        taxes: new Decimal(0),
        instruments: new Set<string>(),
      };

    if (transaction.instrumentId) {
      record.instruments.add(transaction.instrumentId);
    }

    if (isWithinPeriod(transaction.date, period)) {
      record.commissions = record.commissions.plus(transaction.commissionAmount);
      record.taxes = record.taxes.plus(transaction.taxAmount);
    }

    brokers.set(transaction.brokerId, record);
  }

  for (const broker of brokers.values()) {
    const brokerInput = {
      transactions: input.transactions.filter((transaction) => transaction.brokerId === broker.brokerId),
    };
    broker.value = calculatePortfolioValue(brokerInput, period);
    broker.profit = calculateNetProfit(brokerInput, period);
  }

  return [...brokers.values()].map((broker) => ({
    ...broker,
    instrumentsCount: broker.instruments.size,
  }));
}

export function calculateInstrumentBreakdown(input: AnalyticsInput, period: Period) {
  const positions = buildPositions(input, period);
  const records = new Map<
    string,
    {
      instrumentId: string;
      ticker: string;
      name: string;
      type: string;
      marketValue: Decimal;
      realizedProfit: Decimal;
      unrealizedProfit: Decimal;
      dividends: Decimal;
      coupons: Decimal;
      taxes: Decimal;
      commissions: Decimal;
      profit: Decimal;
    }
  >();

  for (const position of positions) {
    records.set(position.instrumentId, {
      instrumentId: position.instrumentId,
      ticker: position.instrumentTicker,
      name: position.instrumentName,
      type: position.instrumentType,
      marketValue: position.marketValue,
      realizedProfit: new Decimal(0),
      unrealizedProfit: position.unrealizedProfit,
      dividends: new Decimal(0),
      coupons: new Decimal(0),
      taxes: new Decimal(0),
      commissions: new Decimal(0),
      profit: position.unrealizedProfit,
    });
  }

  for (const transaction of periodTransactions(input, period)) {
    if (!transaction.instrumentId) {
      continue;
    }

    const record =
      records.get(transaction.instrumentId) ??
      {
        instrumentId: transaction.instrumentId,
        ticker: transaction.instrumentTicker ?? "N/A",
        name: transaction.instrumentName ?? "Инструмент",
        type: transaction.instrumentType ?? "OTHER",
        marketValue: new Decimal(0),
        realizedProfit: new Decimal(0),
        unrealizedProfit: new Decimal(0),
        dividends: new Decimal(0),
        coupons: new Decimal(0),
        taxes: new Decimal(0),
        commissions: new Decimal(0),
        profit: new Decimal(0),
      };

    if (op(transaction.operationType) === "DIVIDEND") {
      record.dividends = record.dividends.plus(transaction.amountGross);
    }

    if (op(transaction.operationType) === "COUPON") {
      record.coupons = record.coupons.plus(transaction.amountGross);
    }

    record.taxes = record.taxes.plus(transaction.taxAmount);
    record.commissions = record.commissions.plus(transaction.commissionAmount);
    records.set(transaction.instrumentId, record);
  }

  for (const record of records.values()) {
    const instrumentInput = {
      transactions: input.transactions.filter((transaction) => transaction.instrumentId === record.instrumentId),
    };
    record.realizedProfit = calculateRealizedProfit(instrumentInput, period);
    record.profit = record.realizedProfit
      .plus(record.unrealizedProfit)
      .plus(record.dividends)
      .plus(record.coupons)
      .minus(record.taxes)
      .minus(record.commissions);
  }

  return [...records.values()].sort((a, b) => b.profit.cmp(a.profit));
}

export function calculateMonthlyProfit(input: AnalyticsInput, period: Period): MonthlyAnalytics[] {
  const records = new Map<string, MonthlyAnalytics>();

  for (const transaction of periodTransactions(input, period)) {
    const key = monthKey(transaction.date);
    const record =
      records.get(key) ??
      {
        month: key,
        profit: new Decimal(0),
        dividends: new Decimal(0),
        coupons: new Decimal(0),
        taxes: new Decimal(0),
        commissions: new Decimal(0),
      };

    const operationType = op(transaction.operationType);
    let transactionProfit = new Decimal(0);

    if (operationType === "DIVIDEND") {
      record.dividends = record.dividends.plus(transaction.amountGross);
      transactionProfit = transactionProfit.plus(transaction.amountGross);
    }

    if (operationType === "COUPON") {
      record.coupons = record.coupons.plus(transaction.amountGross);
      transactionProfit = transactionProfit.plus(transaction.amountGross);
    }

    record.taxes = record.taxes.plus(transaction.taxAmount);
    record.commissions = record.commissions.plus(transaction.commissionAmount);
    record.profit = record.profit
      .plus(transactionProfit)
      .minus(transaction.taxAmount)
      .minus(transaction.commissionAmount);
    records.set(key, record);
  }

  return [...records.values()].sort((a, b) => a.month.localeCompare(b.month));
}

export function calculateAssetAllocation(input: AnalyticsInput, period: Period) {
  const records = new Map<string, Decimal>();

  for (const position of buildPositions(input, period)) {
    records.set(position.instrumentType, (records.get(position.instrumentType) ?? new Decimal(0)).plus(position.marketValue));
  }

  const cash = calculateCashBalance(input, period);
  if (!cash.isZero()) {
    records.set("CASH", (records.get("CASH") ?? new Decimal(0)).plus(cash));
  }

  const total = [...records.values()].reduce((sum, value) => sum.plus(value), new Decimal(0));

  return [...records.entries()].map(([type, value]) => ({
    type,
    value,
    share: total.isZero() ? new Decimal(0) : value.div(total),
  }));
}

export function calculatePortfolioHistory(input: AnalyticsInput, period: Period) {
  const dates = [
    ...new Set(
      periodTransactions(input, period)
        .map((transaction) => transaction.date.toISOString().slice(0, 10))
        .concat(period.endDate.toISOString().slice(0, 10)),
    ),
  ].sort();

  return dates.map((date) => {
    const pointDate = new Date(`${date}T23:59:59.999Z`);
    return {
      date,
      value: calculatePortfolioValue(input, { startDate: period.startDate, endDate: pointDate }),
    };
  });
}

export async function loadAnalyticsInput(period: Period): Promise<AnalyticsInput> {
  const transactions = await prisma.transaction.findMany({
    where: {
      date: { lte: period.endDate },
    },
    orderBy: { date: "asc" },
    include: {
      account: {
        include: {
          broker: true,
        },
      },
      instrument: true,
    },
  });

  return {
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      accountId: transaction.accountId,
      accountName: transaction.account.name,
      brokerId: transaction.account.brokerId,
      brokerName: transaction.account.broker.name,
      instrumentId: transaction.instrumentId,
      instrumentTicker: transaction.instrument?.ticker,
      instrumentName: transaction.instrument?.name,
      instrumentType: transaction.instrument?.type,
      currentPrice: transaction.instrument?.currentPrice,
      date: transaction.date,
      operationType: transaction.operationType,
      quantity: transaction.quantity,
      price: transaction.price,
      amountGross: transaction.amountGross,
      taxAmount: transaction.taxAmount,
      commissionAmount: transaction.commissionAmount,
      amountNet: transaction.amountNet,
      accruedInterest: transaction.accruedInterest,
      currency: transaction.currency,
    })),
  };
}

export async function getPortfolioAnalytics(period: Period) {
  const input = await loadAnalyticsInput(period);
  const value = calculatePortfolioValue(input, period);
  const grossProfit = calculateGrossProfit(input, period);
  const netProfit = calculateNetProfit(input, period);
  const xirr = calculateXirr(input, period);
  const days = getDaysInPeriod(period);
  const returnPercent = xirr ? Decimal.pow(xirr.plus(1), new Decimal(days).div(365)).minus(1) : new Decimal(0);
  const instruments = calculateInstrumentBreakdown(input, period);

  return {
    input,
    value,
    grossProfit,
    netProfit,
    profitWithDividends: calculateProfitWithDividends(input, period),
    profitWithoutDividends: calculateProfitWithoutDividends(input, period),
    profitWithCoupons: calculateProfitWithCoupons(input, period),
    profitWithoutCoupons: calculateProfitWithoutCoupons(input, period),
    realizedProfit: calculateRealizedProfit(input, period),
    unrealizedProfit: calculateUnrealizedProfit(input, period),
    commissions: calculateCommissions(input, period),
    taxes: calculateTaxes(input, period),
    dividendsGross: calculateDividendsGross(input, period),
    dividendsNet: calculateDividendsNet(input, period),
    couponsGross: calculateCouponsGross(input, period),
    couponsNet: calculateCouponsNet(input, period),
    deposits: calculateDeposits(input, period),
    withdrawals: calculateWithdrawals(input, period),
    returnPercent,
    annualReturn: xirr,
    xirr,
    brokerBreakdown: calculateBrokerBreakdown(input, period),
    instrumentBreakdown: instruments,
    monthlyProfit: calculateMonthlyProfit(input, period),
    portfolioHistory: calculatePortfolioHistory(input, period),
    assetAllocation: calculateAssetAllocation(input, period),
    bestAsset: instruments[0] ?? null,
    worstAsset: instruments.at(-1) ?? null,
  };
}

export type PortfolioAnalytics = Awaited<ReturnType<typeof getPortfolioAnalytics>>;
