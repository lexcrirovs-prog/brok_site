-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BrokerType" AS ENUM ('TBANK', 'SBER', 'VTB', 'OTHER');

-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('brokerage', 'IIS', 'other');

-- CreateEnum
CREATE TYPE "InstrumentType" AS ENUM ('stock', 'bond', 'fund', 'currency', 'cash', 'other');

-- CreateEnum
CREATE TYPE "OperationType" AS ENUM ('buy', 'sell', 'dividend', 'coupon', 'bond_redemption', 'tax', 'commission', 'deposit', 'withdrawal', 'currency_exchange', 'broker_fee', 'other');

-- CreateEnum
CREATE TYPE "ImportFileStatus" AS ENUM ('uploaded', 'parsed', 'needs_review', 'error');

-- CreateEnum
CREATE TYPE "ImportRowStatus" AS ENUM ('recognized', 'needs_review', 'duplicate', 'confirmed', 'rejected');

-- CreateEnum
CREATE TYPE "WatchlistStatus" AS ENUM ('watching', 'bought', 'rejected', 'archived');

-- CreateEnum
CREATE TYPE "InvestmentSourceType" AS ENUM ('blogger', 'analyst', 'own_idea', 'news', 'report', 'other');

-- CreateEnum
CREATE TYPE "InvestmentIdeaStatus" AS ENUM ('active', 'worked', 'wrong', 'archived');

-- CreateEnum
CREATE TYPE "PriceSourceType" AS ENUM ('manual', 'csv_import', 'api');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Broker" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "BrokerType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Broker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "accountType" "AccountType" NOT NULL DEFAULT 'brokerage',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instrument" (
    "id" TEXT NOT NULL,
    "ticker" TEXT NOT NULL,
    "isin" TEXT,
    "name" TEXT NOT NULL,
    "type" "InstrumentType" NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "sector" TEXT,
    "country" TEXT,
    "currentPrice" DECIMAL(20,6),
    "currentPriceDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Instrument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrumentId" TEXT,
    "date" TIMESTAMP(3) NOT NULL,
    "operationType" "OperationType" NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL DEFAULT 0,
    "price" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "amountGross" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "taxAmount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "commissionAmount" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "amountNet" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "accruedInterest" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "sourceFileId" TEXT,
    "rawText" TEXT,
    "comment" TEXT,
    "fingerprint" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PositionSnapshot" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "quantity" DECIMAL(24,8) NOT NULL,
    "averagePrice" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "marketPrice" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "marketValue" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "unrealizedProfit" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PositionSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportFile" (
    "id" TEXT NOT NULL,
    "brokerId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "storagePath" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" "ImportFileStatus" NOT NULL DEFAULT 'uploaded',
    "detectedPeriodStart" TIMESTAMP(3),
    "detectedPeriodEnd" TIMESTAMP(3),
    "errorMessage" TEXT,

    CONSTRAINT "ImportFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRow" (
    "id" TEXT NOT NULL,
    "importFileId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "normalizedData" JSONB,
    "status" "ImportRowStatus" NOT NULL DEFAULT 'needs_review',
    "warning" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportRow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WatchlistItem" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "targetBuyPrice" DECIMAL(20,6),
    "targetSellPrice" DECIMAL(20,6),
    "priority" INTEGER NOT NULL DEFAULT 3,
    "status" "WatchlistStatus" NOT NULL DEFAULT 'watching',
    "reason" TEXT,
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WatchlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvestmentNote" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "sourceType" "InvestmentSourceType" NOT NULL DEFAULT 'own_idea',
    "sourceName" TEXT,
    "sourceUrl" TEXT,
    "thesis" TEXT,
    "expectedPrice" DECIMAL(20,6),
    "expectedDate" TIMESTAMP(3),
    "reviewDate" TIMESTAMP(3),
    "status" "InvestmentIdeaStatus" NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvestmentNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceUpdate" (
    "id" TEXT NOT NULL,
    "instrumentId" TEXT NOT NULL,
    "price" DECIMAL(20,6) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "source" "PriceSourceType" NOT NULL DEFAULT 'manual',
    "pricedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Broker_type_idx" ON "Broker"("type");

-- CreateIndex
CREATE INDEX "Account_brokerId_idx" ON "Account"("brokerId");

-- CreateIndex
CREATE UNIQUE INDEX "Instrument_isin_key" ON "Instrument"("isin");

-- CreateIndex
CREATE INDEX "Instrument_type_idx" ON "Instrument"("type");

-- CreateIndex
CREATE UNIQUE INDEX "Instrument_ticker_currency_key" ON "Instrument"("ticker", "currency");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_fingerprint_key" ON "Transaction"("fingerprint");

-- CreateIndex
CREATE INDEX "Transaction_accountId_date_idx" ON "Transaction"("accountId", "date");

-- CreateIndex
CREATE INDEX "Transaction_instrumentId_idx" ON "Transaction"("instrumentId");

-- CreateIndex
CREATE INDEX "Transaction_operationType_idx" ON "Transaction"("operationType");

-- CreateIndex
CREATE INDEX "PositionSnapshot_date_idx" ON "PositionSnapshot"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PositionSnapshot_accountId_instrumentId_date_key" ON "PositionSnapshot"("accountId", "instrumentId", "date");

-- CreateIndex
CREATE INDEX "ImportFile_brokerId_uploadedAt_idx" ON "ImportFile"("brokerId", "uploadedAt");

-- CreateIndex
CREATE INDEX "ImportFile_status_idx" ON "ImportFile"("status");

-- CreateIndex
CREATE INDEX "ImportRow_status_idx" ON "ImportRow"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ImportRow_importFileId_rowIndex_key" ON "ImportRow"("importFileId", "rowIndex");

-- CreateIndex
CREATE INDEX "WatchlistItem_status_priority_idx" ON "WatchlistItem"("status", "priority");

-- CreateIndex
CREATE INDEX "InvestmentNote_sourceType_idx" ON "InvestmentNote"("sourceType");

-- CreateIndex
CREATE INDEX "InvestmentNote_status_idx" ON "InvestmentNote"("status");

-- CreateIndex
CREATE INDEX "PriceUpdate_instrumentId_pricedAt_idx" ON "PriceUpdate"("instrumentId", "pricedAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "ImportFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionSnapshot" ADD CONSTRAINT "PositionSnapshot_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PositionSnapshot" ADD CONSTRAINT "PositionSnapshot_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportFile" ADD CONSTRAINT "ImportFile_brokerId_fkey" FOREIGN KEY ("brokerId") REFERENCES "Broker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRow" ADD CONSTRAINT "ImportRow_importFileId_fkey" FOREIGN KEY ("importFileId") REFERENCES "ImportFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WatchlistItem" ADD CONSTRAINT "WatchlistItem_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvestmentNote" ADD CONSTRAINT "InvestmentNote_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PriceUpdate" ADD CONSTRAINT "PriceUpdate_instrumentId_fkey" FOREIGN KEY ("instrumentId") REFERENCES "Instrument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

