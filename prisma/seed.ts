import {
  AccountType,
  BrokerType,
  InstrumentType,
  InvestmentIdeaStatus,
  InvestmentSourceType,
  OperationType,
  PriceSourceType,
  PrismaClient,
  WatchlistStatus,
} from "@prisma/client";
import { hashPassword } from "../src/lib/auth";
import { createTransactionFingerprint } from "../src/lib/portfolio/fingerprint";

const prisma = new PrismaClient();

async function reset() {
  await prisma.priceUpdate.deleteMany();
  await prisma.watchlistItem.deleteMany();
  await prisma.investmentNote.deleteMany();
  await prisma.positionSnapshot.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.importRow.deleteMany();
  await prisma.importFile.deleteMany();
  await prisma.account.deleteMany();
  await prisma.broker.deleteMany();
  await prisma.instrument.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();

  await prisma.user.create({
    data: {
      email: process.env.DEFAULT_USER_EMAIL ?? "investor@example.com",
      passwordHash: await hashPassword(process.env.DEFAULT_USER_PASSWORD ?? "password123"),
      name: "Частный инвестор",
    },
  });

  const [tbank, sberBroker, vtb] = await Promise.all([
    prisma.broker.create({ data: { name: "Т-Банк Инвестиции", type: BrokerType.TBANK } }),
    prisma.broker.create({ data: { name: "СберИнвестиции", type: BrokerType.SBER } }),
    prisma.broker.create({ data: { name: "ВТБ Инвестиции", type: BrokerType.VTB } }),
  ]);

  const [tbankAccount, sberAccount, vtbAccount] = await Promise.all([
    prisma.account.create({
      data: { brokerId: tbank.id, name: "Основной брокерский счет", currency: "RUB", accountType: AccountType.BROKERAGE },
    }),
    prisma.account.create({
      data: { brokerId: sberBroker.id, name: "ИИС", currency: "RUB", accountType: AccountType.IIS },
    }),
    prisma.account.create({
      data: { brokerId: vtb.id, name: "Долгосрочный портфель", currency: "RUB", accountType: AccountType.BROKERAGE },
    }),
  ]);

  const instrumentsData = [
    ["SBER", "RU0009029540", "Сбербанк", InstrumentType.STOCK, "Финансы", "Россия", "305.40"],
    ["GAZP", "RU0007661625", "Газпром", InstrumentType.STOCK, "Энергетика", "Россия", "171.20"],
    ["LKOH", "RU0009024277", "Лукойл", InstrumentType.STOCK, "Энергетика", "Россия", "7350.00"],
    ["YDEX", "NL0009805522", "Яндекс", InstrumentType.STOCK, "Технологии", "Россия", "4240.00"],
    ["T", "RU000A107UL4", "Т-Технологии", InstrumentType.STOCK, "Финансы", "Россия", "3260.00"],
    ["AFLT", "RU0009062285", "Аэрофлот", InstrumentType.STOCK, "Транспорт", "Россия", "61.80"],
    ["NVTK", "RU000A0DKVS5", "Новатэк", InstrumentType.STOCK, "Энергетика", "Россия", "1184.00"],
    ["GMKN", "RU0007288411", "Норникель", InstrumentType.STOCK, "Металлы", "Россия", "156.50"],
    ["OZON", "US69269L1044", "Ozon", InstrumentType.STOCK, "Потребительский сектор", "Россия", "3480.00"],
    ["POSI", "RU000A103X66", "Positive Technologies", InstrumentType.STOCK, "Технологии", "Россия", "2920.00"],
    ["OFZ26238", "RU000A1038V6", "ОФЗ 26238", InstrumentType.BOND, "Гособлигации", "Россия", "612.40"],
    ["OFZ26244", "RU000A1074G2", "ОФЗ 26244", InstrumentType.BOND, "Гособлигации", "Россия", "887.10"],
    ["RUCBITR", "RU000A105A95", "Брусника 002P", InstrumentType.BOND, "Недвижимость", "Россия", "1010.20"],
    ["RUSALB1", "RU000A105104", "Русал БО-05", InstrumentType.BOND, "Металлы", "Россия", "998.00"],
    ["SBERBOND", "RU000A103661", "Сбербанк БО", InstrumentType.BOND, "Финансы", "Россия", "1004.50"],
  ] as const;

  const instruments = new Map<string, { id: string; currentPrice: string }>();
  for (const [ticker, isin, name, type, sector, country, currentPrice] of instrumentsData) {
    const instrument = await prisma.instrument.create({
      data: {
        ticker,
        isin,
        name,
        type,
        currency: "RUB",
        sector,
        country,
        currentPrice,
        currentPriceDate: new Date("2026-04-25"),
        priceUpdates: {
          create: {
            price: currentPrice,
            currency: "RUB",
            source: PriceSourceType.MANUAL,
            pricedAt: new Date("2026-04-25"),
          },
        },
      },
    });
    instruments.set(ticker, { id: instrument.id, currentPrice });
  }

  async function addTx(input: {
    accountId: string;
    brokerId: string;
    ticker?: string;
    date: string;
    operationType: OperationType;
    quantity?: string;
    price?: string;
    amountGross: string;
    taxAmount?: string;
    commissionAmount?: string;
    amountNet?: string;
    accruedInterest?: string;
    comment?: string;
  }) {
    const instrumentId = input.ticker ? instruments.get(input.ticker)?.id ?? null : null;
    const fingerprint = createTransactionFingerprint({
      brokerId: input.brokerId,
      accountId: input.accountId,
      date: input.date,
      operationType: input.operationType,
      instrumentId,
      quantity: input.quantity ?? "0",
      amountGross: input.amountGross,
      currency: "RUB",
    });

    return prisma.transaction.create({
      data: {
        accountId: input.accountId,
        instrumentId,
        date: new Date(input.date),
        operationType: input.operationType,
        quantity: input.quantity ?? "0",
        price: input.price ?? "0",
        amountGross: input.amountGross,
        taxAmount: input.taxAmount ?? "0",
        commissionAmount: input.commissionAmount ?? "0",
        amountNet: input.amountNet ?? input.amountGross,
        accruedInterest: input.accruedInterest ?? "0",
        currency: "RUB",
        comment: input.comment,
        rawText: "seed",
        fingerprint,
      },
    });
  }

  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, date: "2025-01-10", operationType: OperationType.DEPOSIT, amountGross: "450000", amountNet: "450000" });
  await addTx({ accountId: sberAccount.id, brokerId: sberBroker.id, date: "2025-02-03", operationType: OperationType.DEPOSIT, amountGross: "300000", amountNet: "300000" });
  await addTx({ accountId: vtbAccount.id, brokerId: vtb.id, date: "2025-03-14", operationType: OperationType.DEPOSIT, amountGross: "250000", amountNet: "250000" });

  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, ticker: "SBER", date: "2025-01-13", operationType: OperationType.BUY, quantity: "700", price: "253.10", amountGross: "177170", commissionAmount: "265.76", amountNet: "-177435.76" });
  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, ticker: "YDEX", date: "2025-02-17", operationType: OperationType.BUY, quantity: "25", price: "3390", amountGross: "84750", commissionAmount: "127.13", amountNet: "-84877.13" });
  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, ticker: "OFZ26238", date: "2025-03-04", operationType: OperationType.BUY, quantity: "120", price: "586.20", amountGross: "70344", commissionAmount: "70.34", accruedInterest: "420.00", amountNet: "-70834.34" });

  await addTx({ accountId: sberAccount.id, brokerId: sberBroker.id, ticker: "LKOH", date: "2025-02-10", operationType: OperationType.BUY, quantity: "18", price: "6490", amountGross: "116820", commissionAmount: "175.23", amountNet: "-116995.23" });
  await addTx({ accountId: sberAccount.id, brokerId: sberBroker.id, ticker: "GAZP", date: "2025-03-18", operationType: OperationType.BUY, quantity: "650", price: "158.40", amountGross: "102960", commissionAmount: "154.44", amountNet: "-103114.44" });
  await addTx({ accountId: sberAccount.id, brokerId: sberBroker.id, ticker: "OFZ26244", date: "2025-04-21", operationType: OperationType.BUY, quantity: "80", price: "842.60", amountGross: "67408", commissionAmount: "67.41", accruedInterest: "260.00", amountNet: "-67735.41" });

  await addTx({ accountId: vtbAccount.id, brokerId: vtb.id, ticker: "T", date: "2025-04-07", operationType: OperationType.BUY, quantity: "40", price: "2910", amountGross: "116400", commissionAmount: "174.60", amountNet: "-116574.60" });
  await addTx({ accountId: vtbAccount.id, brokerId: vtb.id, ticker: "NVTK", date: "2025-05-12", operationType: OperationType.BUY, quantity: "70", price: "1265", amountGross: "88550", commissionAmount: "132.83", amountNet: "-88682.83" });
  await addTx({ accountId: vtbAccount.id, brokerId: vtb.id, ticker: "POSI", date: "2025-06-20", operationType: OperationType.BUY, quantity: "12", price: "2350", amountGross: "28200", commissionAmount: "42.30", amountNet: "-28242.30" });

  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, ticker: "SBER", date: "2025-10-15", operationType: OperationType.SELL, quantity: "200", price: "292.60", amountGross: "58520", taxAmount: "840", commissionAmount: "87.78", amountNet: "57592.22" });
  await addTx({ accountId: vtbAccount.id, brokerId: vtb.id, ticker: "NVTK", date: "2026-02-11", operationType: OperationType.SELL, quantity: "20", price: "1125", amountGross: "22500", commissionAmount: "33.75", amountNet: "22466.25" });

  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, ticker: "SBER", date: "2025-06-18", operationType: OperationType.DIVIDEND, quantity: "700", amountGross: "23660", taxAmount: "3075.80", amountNet: "20584.20" });
  await addTx({ accountId: sberAccount.id, brokerId: sberBroker.id, ticker: "LKOH", date: "2025-12-23", operationType: OperationType.DIVIDEND, quantity: "18", amountGross: "9720", taxAmount: "1263.60", amountNet: "8456.40" });
  await addTx({ accountId: vtbAccount.id, brokerId: vtb.id, ticker: "T", date: "2026-03-03", operationType: OperationType.DIVIDEND, quantity: "40", amountGross: "3120", taxAmount: "405.60", amountNet: "2714.40" });
  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, ticker: "OFZ26238", date: "2025-09-10", operationType: OperationType.COUPON, quantity: "120", amountGross: "4140", taxAmount: "0", amountNet: "4140" });
  await addTx({ accountId: sberAccount.id, brokerId: sberBroker.id, ticker: "OFZ26244", date: "2026-01-15", operationType: OperationType.COUPON, quantity: "80", amountGross: "2768", taxAmount: "0", amountNet: "2768" });

  await addTx({ accountId: tbankAccount.id, brokerId: tbank.id, date: "2025-12-31", operationType: OperationType.BROKER_FEE, amountGross: "590", amountNet: "-590" });
  await addTx({ accountId: sberAccount.id, brokerId: sberBroker.id, date: "2026-02-28", operationType: OperationType.COMMISSION, amountGross: "180", amountNet: "-180" });
  await addTx({ accountId: vtbAccount.id, brokerId: vtb.id, date: "2026-04-04", operationType: OperationType.WITHDRAWAL, amountGross: "25000", amountNet: "25000" });

  await prisma.watchlistItem.createMany({
    data: [
      {
        instrumentId: instruments.get("GMKN")!.id,
        targetBuyPrice: "145.00",
        targetSellPrice: "190.00",
        priority: 2,
        status: WatchlistStatus.WATCHING,
        reason: "Дивидендная идея после нормализации капекса.",
        sourceName: "Собственный скрининг",
      },
      {
        instrumentId: instruments.get("OZON")!.id,
        targetBuyPrice: "3100.00",
        priority: 3,
        status: WatchlistStatus.WATCHING,
        reason: "Рост оборота и улучшение маржинальности.",
        sourceName: "Аналитический обзор",
      },
      {
        instrumentId: instruments.get("RUCBITR")!.id,
        targetBuyPrice: "995.00",
        priority: 1,
        status: WatchlistStatus.BOUGHT,
        reason: "Короткая облигационная идея под купонный поток.",
      },
    ],
  });

  await prisma.investmentNote.createMany({
    data: [
      {
        instrumentId: instruments.get("SBER")!.id,
        title: "Дивидендный сценарий",
        text: "Банк сохраняет высокую рентабельность капитала. Следить за качеством кредитного портфеля.",
        sourceType: InvestmentSourceType.ANALYST,
        sourceName: "Еженедельный обзор рынка",
        sourceUrl: "https://example.com/sber-review",
        thesis: "Покупать на просадках при сохранении дивидендной политики.",
        expectedPrice: "340",
        expectedDate: new Date("2026-12-31"),
        reviewDate: new Date("2026-07-01"),
        status: InvestmentIdeaStatus.ACTIVE,
      },
      {
        instrumentId: instruments.get("YDEX")!.id,
        title: "Рост рекламной выручки",
        text: "Идея строится на росте поиска, e-com и подписочных сервисов.",
        sourceType: InvestmentSourceType.BLOGGER,
        sourceName: "Иван Иванов",
        sourceUrl: "https://example.com/video",
        thesis: "Добирать ниже 3900 рублей, если не ухудшается маржинальность.",
        expectedPrice: "4800",
        expectedDate: new Date("2026-10-01"),
        reviewDate: new Date("2026-06-01"),
        status: InvestmentIdeaStatus.ACTIVE,
      },
      {
        instrumentId: instruments.get("OFZ26244")!.id,
        title: "Ставочная идея",
        text: "Длинная ОФЗ выигрывает при снижении ключевой ставки, но чувствительна к инфляционным сюрпризам.",
        sourceType: InvestmentSourceType.OWN_IDEA,
        thesis: "Держать как часть облигационной доли.",
        expectedPrice: "930",
        reviewDate: new Date("2026-09-01"),
        status: InvestmentIdeaStatus.ACTIVE,
      },
    ],
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
