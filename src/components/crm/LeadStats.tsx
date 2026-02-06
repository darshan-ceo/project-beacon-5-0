/**
 * LeadStats Component
 * Displays pipeline metrics: total leads, value, conversion rate, avg deal value
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, IndianRupee, TrendingUp, Target } from 'lucide-react';
import { PipelineStats } from '@/types/lead';

interface LeadStatsProps {
  stats: PipelineStats | null;
  isLoading: boolean;
}

const formatCurrency = (value: number): string => {
  if (value >= 10000000) {
    return `₹${(value / 10000000).toFixed(1)}Cr`;
  } else if (value >= 100000) {
    return `₹${(value / 100000).toFixed(1)}L`;
  } else if (value >= 1000) {
    return `₹${(value / 1000).toFixed(1)}K`;
  }
  return `₹${value.toFixed(0)}`;
};

export const LeadStats: React.FC<LeadStatsProps> = ({ stats, isLoading }) => {
  const statCards = [
    {
      label: 'Total Leads',
      value: stats?.total_leads ?? 0,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Pipeline Value',
      value: formatCurrency(stats?.total_value ?? 0),
      icon: IndianRupee,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
    {
      label: 'Conversion Rate',
      value: `${(stats?.conversion_rate ?? 0).toFixed(1)}%`,
      icon: TrendingUp,
      color: 'text-amber-600',
      bgColor: 'bg-amber-100',
    },
    {
      label: 'Avg Deal Value',
      value: formatCurrency(stats?.avg_deal_value ?? 0),
      icon: Target,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <Card key={stat.label} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
