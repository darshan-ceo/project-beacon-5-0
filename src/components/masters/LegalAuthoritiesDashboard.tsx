import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Scale, 
  Gavel, 
  Landmark, 
  Building2, 
  University, 
  ClipboardList, 
  Activity,
  Shield,
  FileText,
  Eye
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useAppState, getActiveCourtCases, getTotalActiveCases, getJurisdictionInsights } from '@/contexts/AppStateContext';
import { AuthorityLevel } from '@/types/authority-level';
import { AUTHORITY_LEVEL_METADATA } from '@/types/authority-level';

interface DashboardCard {
  key: string;
  label: string;
  hint: string;
  tooltip: string;
  getValue: (courts: any[], cases: any[]) => number;
  icon: any;
  gradient: string;
}

const DASHBOARD_CARDS: DashboardCard[] = [
  {
    key: 'TOTAL_LEGAL_FORUMS',
    label: 'Total Legal Forums',
    hint: 'Across all entries',
    tooltip: 'Total count of forum entries configured in master database',
    getValue: (courts, cases) => courts.length,
    icon: Building2,
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    key: 'ACTIVE_AUTHORITIES',
    label: 'Active Authorities',
    hint: 'Operational forums',
    tooltip: 'Count of authorities currently accepting cases (excludes inactive/merged forums)',
    getValue: (courts, cases) => courts.filter(c => (c.status || 'Active') === 'Active').length,
    icon: ClipboardList,
    gradient: 'from-purple-500 to-pink-500'
  },
  {
    key: 'ACTIVE_CASES_TOTAL',
    label: 'Active Cases (All Forums)',
    hint: 'Cases with scheduled hearings',
    tooltip: 'Total count of active cases across all legal authorities with next hearing scheduled. Updates in real-time as hearings are scheduled or cases are completed.',
    getValue: (courts, cases) => getTotalActiveCases(cases),
    icon: FileText,
    gradient: 'from-cyan-500 to-blue-500'
  },
  {
    key: 'ADJUDICATION',
    label: 'Adjudication Authority',
    hint: 'Original authority',
    tooltip: 'Proper Officer / Commissionerate - Original adjudicating authority',
    getValue: (courts, cases) => courts.filter(c => c.authorityLevel === 'ADJUDICATION' && (c.status || 'Active') === 'Active').length,
    icon: Gavel,
    gradient: 'from-blue-400 to-blue-600'
  },
  {
    key: 'FIRST_APPEAL',
    label: 'First Appeal',
    hint: 'Commissioner (Appeals) / AA',
    tooltip: 'First appellate authority - Commissioner (Appeals) / Appellate Authority',
    getValue: (courts, cases) => courts.filter(c => c.authorityLevel === 'FIRST_APPEAL' && (c.status || 'Active') === 'Active').length,
    icon: Scale,
    gradient: 'from-green-400 to-green-600'
  },
  {
    key: 'REVISIONAL',
    label: 'Revisional Authority',
    hint: 'S.108 GST / Revisional',
    tooltip: 'Revisional jurisdiction under Section 108 GST Act and similar provisions',
    getValue: (courts, cases) => courts.filter(c => c.authorityLevel === 'REVISIONAL' && (c.status || 'Active') === 'Active').length,
    icon: Activity,
    gradient: 'from-yellow-400 to-amber-600'
  },
  {
    key: 'TRIBUNAL',
    label: 'GTAT / CESTAT / ITAT',
    hint: 'Tribunal benches',
    tooltip: 'Appellate tribunal benches - GTAT, CESTAT, ITAT, and other specialized tribunals',
    getValue: (courts, cases) => courts.filter(c => c.authorityLevel === 'TRIBUNAL' && (c.status || 'Active') === 'Active').length,
    icon: Landmark,
    gradient: 'from-purple-400 to-purple-600'
  },
  {
    key: 'PRINCIPAL_BENCH',
    label: 'Principal Bench',
    hint: 'Head bench of tribunal',
    tooltip: 'Principal/Head bench of appellate tribunals with national jurisdiction',
    getValue: (courts, cases) => courts.filter(c => c.authorityLevel === 'PRINCIPAL_BENCH' && (c.status || 'Active') === 'Active').length,
    icon: University,
    gradient: 'from-indigo-400 to-indigo-600'
  },
  {
    key: 'HIGH_COURT',
    label: 'High Court',
    hint: 'State jurisdiction',
    tooltip: 'State High Courts - Constitutional courts with appellate jurisdiction',
    getValue: (courts, cases) => courts.filter(c => c.authorityLevel === 'HIGH_COURT' && (c.status || 'Active') === 'Active').length,
    icon: Shield,
    gradient: 'from-orange-400 to-orange-600'
  },
  {
    key: 'SUPREME_COURT',
    label: 'Supreme Court',
    hint: 'Apex court',
    tooltip: 'Supreme Court of India - Apex constitutional court with national jurisdiction',
    getValue: (courts, cases) => courts.filter(c => c.authorityLevel === 'SUPREME_COURT' && (c.status || 'Active') === 'Active').length,
    icon: University,
    gradient: 'from-red-400 to-red-600'
  }
];

interface JurisdictionInsightsPanelProps {
  jurisdiction: string;
  courts: any[];
  cases: any[];
}

const JurisdictionInsightsPanel: React.FC<JurisdictionInsightsPanelProps> = ({
  jurisdiction,
  courts,
  cases
}) => {
  const insights = getJurisdictionInsights(courts, cases, jurisdiction);
  
  const levelCards = [
    {
      level: 'ADJUDICATION',
      label: 'Adjudication',
      icon: Gavel,
      gradient: 'from-blue-400 to-blue-600'
    },
    {
      level: 'FIRST_APPEAL',
      label: 'First Appeal',
      icon: Scale,
      gradient: 'from-green-400 to-green-600'
    },
    {
      level: 'TRIBUNAL',
      label: 'Tribunal',
      icon: Landmark,
      gradient: 'from-purple-400 to-purple-600'
    },
    {
      level: 'HIGH_COURT',
      label: 'High Court',
      icon: Shield,
      gradient: 'from-orange-400 to-orange-600'
    }
  ];

  return (
    <Card className="mb-6 border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Jurisdiction Insights - {jurisdiction}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Active cases across {insights.totalCourts} forums in your jurisdiction
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">
              {insights.totalActiveCases}
            </div>
            <p className="text-xs text-muted-foreground">Total Active Cases</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {levelCards.map(({ level, label, icon: Icon, gradient }) => {
            const data = insights.byLevel[level] || { count: 0, cases: 0 };
            
            return (
              <Card 
                key={level}
                className="cursor-pointer hover:shadow-md transition-all"
                onClick={() => {
                  window.location.href = `/cases?jurisdiction=${encodeURIComponent(jurisdiction)}&level=${level}`;
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className={`p-2 rounded-lg bg-gradient-to-br ${gradient}`}>
                      <Icon className="h-4 w-4 text-white" />
                    </div>
                    <Badge variant="secondary" className="font-mono">
                      {data.cases}
                    </Badge>
                  </div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {data.count} forum{data.count !== 1 ? 's' : ''}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <div className="mt-4 text-xs text-muted-foreground flex items-center gap-1">
          <Eye className="h-3 w-3" />
          Click any card to view filtered cases
        </div>
      </CardContent>
    </Card>
  );
};

export const LegalAuthoritiesDashboard: React.FC = () => {
  const { state } = useAppState();
  const courts = state.courts || [];
  const cases = state.cases || [];

  return (
    <TooltipProvider>
      <div>
        {/* Jurisdiction Insights Panel */}
        <JurisdictionInsightsPanel 
          jurisdiction="Gujarat State"
          courts={courts}
          cases={cases}
        />
        
        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {DASHBOARD_CARDS.map((card) => {
            const Icon = card.icon;
            const value = card.getValue(courts, cases);

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
      </div>
    </TooltipProvider>
  );
};
