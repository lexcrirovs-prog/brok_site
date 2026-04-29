import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { AddAccountForm, AddBrokerForm, PriceCsvImportForm, PriceUpdateForm } from "@/components/quick-forms";
import { UploadReportForm } from "@/components/upload-report-form";
import { DefaultCurrencyForm, SettingsActions } from "@/components/settings-actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [brokers, instruments] = await Promise.all([
    prisma.broker.findMany({ orderBy: { name: "asc" } }),
    prisma.instrument.findMany({ orderBy: { ticker: "asc" } }),
  ]);

  const brokerOptions = brokers.map((broker) => ({ id: broker.id, name: broker.name }));
  const instrumentOptions = instruments.map((instrument) => ({ id: instrument.id, ticker: instrument.ticker, name: instrument.name }));

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" />
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Брокеры и счета</h2>
        <AddBrokerForm />
        <AddAccountForm brokers={brokerOptions} />
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Файлы и цены</h2>
        <UploadReportForm brokers={brokerOptions} />
        <PriceUpdateForm instruments={instrumentOptions} />
        <PriceCsvImportForm />
      </section>
      <section className="space-y-3">
        <h2 className="text-base font-semibold">Данные</h2>
        <DefaultCurrencyForm />
        <SettingsActions />
      </section>
    </div>
  );
}
