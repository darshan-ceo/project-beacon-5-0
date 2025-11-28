import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppState } from '@/contexts/AppStateContext';
import { Users } from 'lucide-react';
import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const CaseLoadByAdvocateWidget = () => {
  const { state } = useAppState();

  const chartData = useMemo(() => {
    const casesByAdvocate = new Map<string, { name: string; count: number }>();

    state.cases.forEach(caseItem => {
      if (caseItem.assignedToId && caseItem.status === 'Active') {
        const employee = state.employees.find(e => e.id === caseItem.assignedToId);
        const name = employee?.full_name || 'Unknown';
        
        if (casesByAdvocate.has(caseItem.assignedToId)) {
          casesByAdvocate.get(caseItem.assignedToId)!.count++;
        } else {
          casesByAdvocate.set(caseItem.assignedToId, { name, count: 1 });
        }
      }
    });

    return Array.from(casesByAdvocate.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => ({
        name: item.name.split(' ')[0] || item.name,
        count: item.count
      }));
  }, [state.cases, state.employees]);

  return (
    <Card className="hover:shadow-lg transition-shadow bg-gradient-to-br from-orange-50 to-red-50 md:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Users className="h-4 w-4 text-orange-600" />
          Case Load by Advocate
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[180px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis 
                dataKey="name" 
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#f97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
};
