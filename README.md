# brok_site

Веб-приложение для учета инвестиционного портфеля частного инвестора.

Стек: Next.js, TypeScript, Tailwind CSS, Recharts, PostgreSQL, Prisma, Decimal.js, Vitest.

## Возможности MVP

- загрузка отчетов PDF/XLSX/CSV;
- отдельные parser adapter: `TBankParser`, `SberParser`, `VtbParser`, `GenericCsvParser`, `GenericPdfParser`;
- экран проверки операций перед сохранением;
- защита от дублей через fingerprint;
- события портфеля вместо хранения только остатков;
- таблица операций;
- dashboard и analytics с графиками Recharts;
- страницы брокеров, инструментов, watchlist, заметок и настроек;
- ручное обновление цен и CSV-импорт котировок;
- локальная авторизация email/password;
- seed-данные и тесты расчетов.

## Установка

```bash
npm install
```

Создайте `.env`:

```bash
cp .env.example .env
```

На Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

## PostgreSQL

Через Docker:

```bash
docker compose up -d
```

Строка подключения по умолчанию:

```env
DATABASE_URL="postgresql://portfolio:portfolio@localhost:5432/brok_site?schema=public"
```

## Миграции и seed

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
npm run prisma:seed
```

Тестовый вход:

- email: `investor@example.com`
- пароль: `password123`

## Запуск

```bash
npm run dev
```

Откройте:

```text
http://localhost:3000/invest
```

Приложение собрано с `basePath=/invest`, чтобы работать по адресу:

```text
https://kotelgavno.ru/invest
```

## Первый отчет

1. Откройте `Import Reports`.
2. Выберите брокера.
3. Загрузите `sample-reports/sample-transactions.csv`.
4. Проверьте строки.
5. Нажмите `Подтвердить импорт`.

## Поддерживаемые форматы

- CSV: автоопределение колонок по русским и английским заголовкам.
- XLSX: читается первый лист, затем используется тот же маппинг колонок.
- PDF: сейчас `GenericPdfParser` извлекает сырой текст и переводит импорт в `needs_review`.

Для реальных PDF Т-Банка, Сбера и ВТБ нужны образцы отчетов. Архитектура уже готова: каждый брокер имеет отдельный адаптер.

## Как добавить новый парсер брокера

1. Создайте файл в `src/lib/import/parsers`.
2. Реализуйте интерфейс `ReportParser`.
3. Верните `ParseResult` с массивом `ParsedTransaction`.
4. Зарегистрируйте парсер в `src/lib/import/parserRegistry.ts`.
5. Добавьте тестовый файл отчета.

Минимальный контракт:

```ts
export interface ReportParser {
  name: string;
  brokerType: "TBANK" | "SBER" | "VTB" | "OTHER";
  supports(fileType: string, fileName: string): boolean;
  parse(input: ParserInput): Promise<ParseResult>;
}
```

## CSV-колонки для операций

Поддерживаются варианты:

- `date`, `Дата`, `Дата операции`
- `operation`, `Операция`, `Тип операции`
- `ticker`, `Тикер`
- `isin`, `ISIN`
- `instrument`, `Инструмент`, `Актив`
- `quantity`, `Количество`
- `price`, `Цена`
- `amountGross`, `Сумма до налогов`, `Сумма`
- `tax`, `Налог`
- `commission`, `Комиссия`
- `amountNet`, `Сумма после налогов`, `Итого`
- `currency`, `Валюта`
- `account`, `Счет`
- `НКД`, `accrued interest`

Типы операций:

`buy`, `sell`, `dividend`, `coupon`, `bond_redemption`, `tax`, `commission`, `deposit`, `withdrawal`, `currency_exchange`, `broker_fee`, `other`.

## CSV с ценами

Файл `sample-reports/prices.csv`:

```csv
ticker,price,currency
SBER,310.5,RUB
LKOH,7400,RUB
```

Загрузите его в `Settings` через блок CSV с ценами.

## Расчеты

Сервис: `src/lib/portfolio/portfolioAnalyticsService.ts`.

Функции:

- `calculatePortfolioValue()`
- `calculateGrossProfit()`
- `calculateNetProfit()`
- `calculateProfitWithDividends()`
- `calculateProfitWithoutDividends()`
- `calculateProfitWithCoupons()`
- `calculateProfitWithoutCoupons()`
- `calculateTaxes()`
- `calculateCommissions()`
- `calculateRealizedProfit()`
- `calculateUnrealizedProfit()`
- `calculateCashflows()`
- `calculateXirr()`
- `calculateBrokerBreakdown()`
- `calculateInstrumentBreakdown()`
- `calculateMonthlyProfit()`
- `calculateAssetAllocation()`

Правила:

- покупка актива не является убытком;
- продажа создает реализованный результат;
- дивиденды и купоны считаются отдельным доходом;
- налоги и комиссии уменьшают чистую прибыль;
- пополнение не является прибылью;
- вывод не является убытком;
- XIRR строится на внешних денежных потоках и терминальной стоимости портфеля.

## Котировки MOEX

Автообновление цен лежит в `src/lib/market-data/moexIssService.ts`.
Кнопки обновления есть на страницах `Инструменты`, `Инструмент` и `Настройки`.

Источник данных — MOEX ISS:

- акции и фонды: `engines/stock/markets/shares`;
- облигации: `engines/stock/markets/bonds`;
- поиск облигаций работает по ISIN, поэтому внутренний тикер может отличаться от биржевого `SECID`;
- облигационные котировки MOEX в процентах от номинала переводятся в цену одной бумаги;
- используется бесплатный режим с задержкой без подписки.

## Проверки

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Деплой на kotelgavno.ru/invest

На сервере нужен Node.js 20+ или 22+, PostgreSQL, nginx и systemd.

1. Создайте `/var/www/brok_site/.env.production` по образцу `.env.production.example`.
2. Укажите реальный `DATABASE_URL` и длинный `AUTH_SECRET`.
3. Запустите:

```bash
bash deploy/deploy-on-server.sh
```

Nginx-пример лежит в `deploy/nginx-invest.conf`.
Systemd unit лежит в `deploy/brok-site.service`.

Если на сервере уже есть конфиг домена, добавьте только блоки `location /invest/` и `location = /invest`.

### Beget shared hosting

Основная схема проекта остается PostgreSQL: `prisma/schema.prisma`.

Для виртуального хостинга Beget без отдельной PostgreSQL-услуги есть deployment-only SQLite-схема:

```bash
DATABASE_URL="file:/home/p/premiuig/kotelgavno.ru/app-data/portfolio.db" npm run prisma:generate:sqlite
DATABASE_URL="file:/home/p/premiuig/kotelgavno.ru/app-data/portfolio.db" npm run prisma:push:sqlite
DATABASE_URL="file:/home/p/premiuig/kotelgavno.ru/app-data/portfolio.db" npm run prisma:seed
```

Так база и файлы остаются внутри аккаунта хостинга. Для возврата к PostgreSQL выполните `npm run prisma:generate`.

## Безопасность

- файлы не отправляются на внешние сервисы;
- загрузки хранятся локально в `UPLOAD_DIR`;
- если `KEEP_UPLOADED_FILES=false`, файл удаляется после парсинга;
- пароли хранятся через bcrypt hash;
- cookie сессии подписываются через HMAC.

## Источники

- Next.js route handlers: https://nextjs.org/docs/app/getting-started/route-handlers
- Prisma schema: https://www.prisma.io/docs/orm/prisma-schema
- MOEX ISS API: https://www.moex.com/a2193
- Decimal.js: https://mikemcl.github.io/decimal.js/
- Recharts: https://recharts.org/
