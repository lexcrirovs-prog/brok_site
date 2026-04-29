"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartPoint = Record<string, string | number>;

const palette = ["#0f172a", "#0f766e", "#b45309", "#2563eb", "#be123c", "#4d7c0f", "#7c3aed", "#0369a1"];

function ChartPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <h2 className="mb-4 text-base font-semibold text-slate-950">{title}</h2>
      <div className="h-72">{children}</div>
    </section>
  );
}

export function PortfolioCharts({
  portfolioHistory,
  monthlyProfit,
  monthlyIncome,
  monthlyCosts,
  brokerBreakdown,
  assetAllocation,
  topProfit,
  topLoss,
  dividendComparison,
  grossNetComparison,
}: {
  portfolioHistory: ChartPoint[];
  monthlyProfit: ChartPoint[];
  monthlyIncome: ChartPoint[];
  monthlyCosts: ChartPoint[];
  brokerBreakdown: ChartPoint[];
  assetAllocation: ChartPoint[];
  topProfit: ChartPoint[];
  topLoss: ChartPoint[];
  dividendComparison: ChartPoint[];
  grossNetComparison: ChartPoint[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartPanel title="Динамика стоимости портфеля">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={portfolioHistory}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Area type="monotone" dataKey="value" stroke="#0f766e" fill="#ccfbf1" name="Стоимость" />
          </AreaChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Прибыль по месяцам">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyProfit}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="profit" fill="#0f172a" name="Прибыль" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Дивиденды и купоны по месяцам">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyIncome}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="dividends" fill="#2563eb" name="Дивиденды" radius={[4, 4, 0, 0]} />
            <Bar dataKey="coupons" fill="#0f766e" name="Купоны" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Налоги и комиссии по месяцам">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={monthlyCosts}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="taxes" fill="#be123c" name="Налоги" radius={[4, 4, 0, 0]} />
            <Bar dataKey="commissions" fill="#b45309" name="Комиссии" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Распределение по брокерам">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={brokerBreakdown} dataKey="value" nameKey="name" outerRadius={96} label>
              {brokerBreakdown.map((_, index) => (
                <Cell key={index} fill={palette[index % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Распределение по типам активов">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={assetAllocation} dataKey="value" nameKey="type" outerRadius={96} label>
              {assetAllocation.map((_, index) => (
                <Cell key={index} fill={palette[(index + 2) % palette.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Топ-10 активов по прибыли">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topProfit} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="ticker" type="category" tick={{ fontSize: 12 }} width={70} />
            <Tooltip />
            <Bar dataKey="profit" fill="#0f766e" name="Прибыль" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Топ-10 активов по убытку">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={topLoss} layout="vertical" margin={{ left: 24 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis type="number" tick={{ fontSize: 12 }} />
            <YAxis dataKey="ticker" type="category" tick={{ fontSize: 12 }} width={70} />
            <Tooltip />
            <Bar dataKey="profit" fill="#be123c" name="Убыток" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Прибыль с дивидендами и без">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={dividendComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Line dataKey="value" stroke="#2563eb" name="Прибыль" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartPanel>

      <ChartPanel title="Валовая и чистая прибыль">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={grossNetComparison}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="label" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#0f172a" name="Сумма" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartPanel>
    </div>
  );
}
