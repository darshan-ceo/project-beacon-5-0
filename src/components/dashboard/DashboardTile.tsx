/**
 * Dashboard Tile Component
 * Renders individual dashboard tiles with dynamic data
 */

import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import * as Icons from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { DashboardTile as TileType } from '@/utils/rbacHelper';
import { format } from 'date-fns';

interface TileProps {
  tile: TileType;
}

export const DashboardTile: React.FC<TileProps> = ({ tile }) => {
  const [mockData, setMockData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const Icon = Icons[tile.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;

  // Load mock data
  useEffect(() => {
    fetch(tile.mockDataSource)
      .then((res) => res.json())
      .then((data) => {
        setMockData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load mock data:', err);
        setLoading(false);
      });
  }, [tile.mockDataSource]);

  if (loading) {
    return (
      <Card className="hover-lift rounded-2xl shadow-sm">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-8 bg-muted rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!mockData) return null;

  const renderContent = () => {
    switch (tile.type) {
      case 'metric':
        return (
          <div className="space-y-2">
            <div className="text-4xl font-bold text-white">{mockData.value}</div>
            {mockData.trend && (
              <p className="text-sm text-white/80">{mockData.trend}</p>
            )}
          </div>
        );

      case 'trafficLight':
        return (
          <div className="flex items-center gap-3">
            <div className="flex flex-col items-center">
              <Badge className="bg-success text-success-foreground">{mockData.green}</Badge>
              <span className="text-xs text-white/70 mt-1">Green</span>
            </div>
            <div className="flex flex-col items-center">
              <Badge className="bg-warning text-warning-foreground">{mockData.amber}</Badge>
              <span className="text-xs text-white/70 mt-1">Amber</span>
            </div>
            <div className="flex flex-col items-center">
              <Badge className="bg-destructive text-destructive-foreground">{mockData.red}</Badge>
              <span className="text-xs text-white/70 mt-1">Red</span>
            </div>
          </div>
        );

      case 'barChart':
        const barData = mockData.labels?.map((label: string, i: number) => ({
          name: label,
          value: mockData.values?.[i] || 0,
        }));
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="#ffffff80" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff80" style={{ fontSize: '12px' }} />
              <Bar dataKey="value" fill="#ffffff" radius={[4, 4, 0, 0]} />
              <ChartTooltip content={<ChartTooltipContent />} />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pieChart':
        const pieData = mockData.labels?.map((label: string, i: number) => ({
          name: label,
          value: mockData.values[i],
        }));
        const COLORS = ['#00C2A8', '#0B5FFF', '#F59E0B', '#EF4444', '#8B5CF6'];
        return (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={70}
                label
              >
                {pieData?.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <ChartTooltip content={<ChartTooltipContent />} />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'list':
        return (
          <div className="space-y-2">
            {mockData.slice(0, 5).map((item: any, i: number) => (
              <div key={i} className="flex justify-between text-sm border-b border-white/20 pb-2">
                <span className="text-white">{item.task}</span>
                <span className="text-white/70">{item.due}</span>
              </div>
            ))}
          </div>
        );

      case 'gauge':
        return (
          <div className="text-center space-y-2">
            <div className="text-5xl font-bold text-white">{mockData.value}%</div>
            <p className="text-sm text-white/80">
              {mockData.completed}/{mockData.total} tasks completed
            </p>
          </div>
        );

      case 'calendarMini':
        return (
          <div className="space-y-3">
            {mockData.slice(0, 3).map((hearing: any, i: number) => (
              <div key={i} className="border-l-2 border-white/40 pl-3 text-white">
                <p className="font-medium text-sm">{hearing.case}</p>
                <p className="text-xs text-white/70">
                  {format(new Date(hearing.date), 'MMM dd, yyyy')} • {hearing.time}
                </p>
                <p className="text-xs text-white/60">{hearing.court}</p>
              </div>
            ))}
          </div>
        );

      case 'status':
        return (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Uptime</span>
              <span className="font-semibold text-white">{mockData.uptime}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/80">Last Sync</span>
              <span className="font-semibold text-white">{mockData.lastSync}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/80">RBAC Audit</span>
              <Badge className="bg-success text-success-foreground">{mockData.rbacAudit}</Badge>
            </div>
          </div>
        );

      default:
        return <div className="text-white">Unknown tile type</div>;
    }
  };

  return (
    <Card className={`hover-lift tile-${tile.colorTheme} rounded-2xl shadow-sm border-0`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-semibold text-white">{tile.title}</CardTitle>
        {Icon && <Icon className="h-5 w-5 text-white/80" />}
      </CardHeader>
      <CardContent className="pt-0">{renderContent()}</CardContent>
    </Card>
  );
};
