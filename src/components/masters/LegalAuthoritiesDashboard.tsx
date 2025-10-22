import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Scale, 
  Gavel, 
  Landmark, 
  Building2, 
  University, 
  ClipboardList, 
  Activity,
  Shield 
} from 'lucide-react';
import { MOCK_LEGAL_AUTH_COUNTS } from '@/mock/legal-authorities';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DashboardCard {
  key: string;
  label: string;
  hint: string;
  tooltip: string;
  getValue: (data: typeof MOCK_LEGAL_AUTH_COUNTS) => number;
  icon: any;
  gradient: string;
}

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    key: 'TOTAL_LEGAL_FORUMS',
    label: 'Total Legal Forums',
    hint: 'Across all entries',
    tooltip: 'Total count of forum entries configured in master database',
    getValue: (d) => d.totalLegalForums,
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    key: 'TOTAL_AUTHORITIES',
    label: 'Total Authorities',
    hint: 'Sum across hierarchy',
    tooltip: 'Sum of all authorities across 8-level GST hierarchy (Division → Supreme Court)',
    getValue: (d) => Object.values(d.levels).reduce((a, b) => a + b, 0),
    icon: ClipboardList,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    key: 'DIVISION',
    label: 'Division',
    hint: 'Division Office',
    tooltip: 'Division Office - Original Authority for GST matters',
    getValue: (d) => d.levels.DIVISION,
    icon: Building2,
    gradient: 'from-sky-400 to-sky-600'
  },
  {
    key: 'COMMISSIONERATE',
    label: 'Commissionerate',
    hint: 'Adjudication Authority',
    tooltip: 'GST Commissionerate - Adjudication Authority',
    getValue: (d) => d.levels.COMMISSIONERATE,
    icon: Gavel,
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    key: 'APPEALS',
    label: 'Commissioner (Appeals)',
    hint: 'First Appeal',
    tooltip: 'Commissioner (Appeals) - First Appellate Authority under GST',
    getValue: (d) => d.levels.APPEALS,
    icon: Scale,
    gradient: 'from-green-400 to-green-600'
  },
  {
    key: 'GSTAT_STATE',
    label: 'GSTAT - State Bench',
    hint: 'State-level tribunal',
    tooltip: 'GST Appellate Tribunal - State Bench with regional jurisdiction',
    getValue: (d) => d.levels.GSTAT_STATE,
    icon: Landmark,
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    key: 'GSTAT_PRINCIPAL',
    label: 'GSTAT - Principal Bench',
    hint: 'Principal bench',
    tooltip: 'GST Appellate Tribunal - Principal/Head Bench with national jurisdiction',
    getValue: (d) => d.levels.GSTAT_PRINCIPAL,
    icon: University,
    gradient: 'from-indigo-400 to-indigo-600'
  },
  {
    key: 'HIGH_COURT',
    label: 'High Court',
    hint: 'State jurisdiction',
    tooltip: 'State High Courts - Constitutional courts with appellate jurisdiction',
    getValue: (d) => d.levels.HIGH_COURT,
    icon: Shield,
    gradient: 'from-orange-400 to-orange-600'
  },
  {
    key: 'SUPREME_COURT',
    label: 'Supreme Court',
    hint: 'Apex court',
    tooltip: 'Supreme Court of India - Apex constitutional court with national jurisdiction',
    getValue: (d) => d.levels.SUPREME_COURT,
    icon: University,
    gradient: 'from-red-400 to-red-600'
  }
];

export const LegalAuthoritiesDashboard: React.FC = () => {
  const data = MOCK_LEGAL_AUTH_COUNTS;

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;
          const value = card.getValue(data);

          return (
            <Tooltip key={card.key}>
              <TooltipTrigger asChild>
                <Card className="rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer border-l-4 border-l-transparent hover:border-l-primary">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {card.label}
                    </CardTitle>
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${card.gradient}`}>
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {card.hint}
                    </p>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs">
                <p>{card.tooltip}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
};
