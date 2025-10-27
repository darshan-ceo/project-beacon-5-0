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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState } from '@/contexts/AppStateContext';
import { AuthorityLevel } from '@/types/authority-level';

interface DashboardCard {
  key: string;
  label: string;
  hint: string;
  tooltip: string;
  getValue: (courts: any[]) => number;
  icon: any;
  gradient: string;
}

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    key: 'TOTAL_LEGAL_FORUMS',
    label: 'Total Legal Forums',
    hint: 'Across all entries',
    tooltip: 'Total count of forum entries configured in master database',
    getValue: (courts) => courts.length,
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    key: 'ACTIVE_AUTHORITIES',
    label: 'Active Authorities',
    hint: 'Operational forums',
    tooltip: 'Count of authorities currently accepting cases (excludes inactive/merged forums)',
    getValue: (courts) => courts.filter(c => (c.status || 'Active') === 'Active').length,
    icon: ClipboardList,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    key: 'ADJUDICATION',
    label: 'Adjudication Authority',
    hint: 'Original authority',
    tooltip: 'Proper Officer / Commissionerate - Original adjudicating authority',
    getValue: (courts) => courts.filter(c => c.authorityLevel === 'ADJUDICATION' && (c.status || 'Active') === 'Active').length,
    icon: Gavel,
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    key: 'FIRST_APPEAL',
    label: 'First Appeal',
    hint: 'Commissioner (Appeals) / AA',
    tooltip: 'First appellate authority - Commissioner (Appeals) / Appellate Authority',
    getValue: (courts) => courts.filter(c => c.authorityLevel === 'FIRST_APPEAL' && (c.status || 'Active') === 'Active').length,
    icon: Scale,
    gradient: 'from-green-400 to-green-600'
  },
  {
    key: 'REVISIONAL',
    label: 'Revisional Authority',
    hint: 'S.108 GST / Revisional',
    tooltip: 'Revisional jurisdiction under Section 108 GST Act and similar provisions',
    getValue: (courts) => courts.filter(c => c.authorityLevel === 'REVISIONAL' && (c.status || 'Active') === 'Active').length,
    icon: Activity,
    gradient: 'from-yellow-400 to-amber-600'
  },
  {
    key: 'TRIBUNAL',
    label: 'GTAT / CESTAT / ITAT',
    hint: 'Tribunal benches',
    tooltip: 'Appellate tribunal benches - GTAT, CESTAT, ITAT, and other specialized tribunals',
    getValue: (courts) => courts.filter(c => c.authorityLevel === 'TRIBUNAL' && (c.status || 'Active') === 'Active').length,
    icon: Landmark,
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    key: 'PRINCIPAL_BENCH',
    label: 'Principal Bench',
    hint: 'Head bench of tribunal',
    tooltip: 'Principal/Head bench of appellate tribunals with national jurisdiction',
    getValue: (courts) => courts.filter(c => c.authorityLevel === 'PRINCIPAL_BENCH' && (c.status || 'Active') === 'Active').length,
    icon: University,
    gradient: 'from-indigo-400 to-indigo-600'
  },
  {
    key: 'HIGH_COURT',
    label: 'High Court',
    hint: 'State jurisdiction',
    tooltip: 'State High Courts - Constitutional courts with appellate jurisdiction',
    getValue: (courts) => courts.filter(c => c.authorityLevel === 'HIGH_COURT' && (c.status || 'Active') === 'Active').length,
    icon: Shield,
    gradient: 'from-orange-400 to-orange-600'
  },
  {
    key: 'SUPREME_COURT',
    label: 'Supreme Court',
    hint: 'Apex court',
    tooltip: 'Supreme Court of India - Apex constitutional court with national jurisdiction',
    getValue: (courts) => courts.filter(c => c.authorityLevel === 'SUPREME_COURT' && (c.status || 'Active') === 'Active').length,
    icon: University,
    gradient: 'from-red-400 to-red-600'
  }
];

export const LegalAuthoritiesDashboard: React.FC = () => {
  const { state } = useAppState();
  const courts = state.courts || [];

  return (
    <TooltipProvider>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {DASHBOARD_CARDS.map((card) => {
          const Icon = card.icon;
          const value = card.getValue(courts);

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
