import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { FinancialSummary } from '@/services/caseIntelligenceService';

interface Props {
  financial: FinancialSummary;
}

const COLORS = ['hsl(var(--primary))', 'hsl(var(--destructive))', 'hsl(210, 70%, 55%)', 'hsl(40, 80%, 55%)'];

export const FinancialExposure: React.FC<Props> = ({ financial }) => {
  const formatCurrency = (n: number) =>
    n >= 10000000 ? `₹${(n / 10000000).toFixed(2)} Cr` :
    n >= 100000 ? `₹${(n / 100000).toFixed(2)} Lakh` :
    `₹${n.toLocaleString('en-IN')}`;

  const chartData = [
    { name: 'Tax Demand', value: financial.taxDemand },
    { name: 'Penalty', value: financial.penalty },
    { name: 'Interest', value: financial.interest },
  ].filter(d => d.value > 0);

  const hasData = financial.totalDemand > 0;

  return (
    <section id="financial">
      <h2 className="text-lg font-semibold text-foreground mb-4 border-b pb-2">Financial Exposure Summary</h2>

      {!hasData ? (
        <p className="text-sm text-muted-foreground italic">No financial data available for this case.</p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Summary Cards */}
          <div className="space-y-3">
            <FinCard label="Total Demand" value={formatCurrency(financial.totalDemand)} accent />
            <FinCard label="Tax Demand" value={formatCurrency(financial.taxDemand)} />
            <FinCard label="Penalty" value={formatCurrency(financial.penalty)} />
            <FinCard label="Interest" value={formatCurrency(financial.interest)} />
            <FinCard label="Contested Amount" value={formatCurrency(financial.contested)} />
          </div>

          {/* Pie Chart */}
          {chartData.length > 0 && (
            <div className="h-64 print:hidden">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={chartData} cx="50%" cy="50%" outerRadius={80} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {chartData.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

const FinCard = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div className={`flex justify-between items-center p-3 rounded-lg ${accent ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'}`}>
    <span className="text-sm text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold ${accent ? 'text-primary' : 'text-foreground'}`}>{value}</span>
  </div>
);
