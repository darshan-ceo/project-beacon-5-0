/**
 * Dashboard Tile Component
 * Renders individual dashboard tiles with dynamic data
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tooltip as UITooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'sonner';
import * as Icons from 'lucide-react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { DashboardTile as TileType } from '@/utils/rbacHelper';
import { format } from 'date-fns';
import { motion } from 'framer-motion';
import { useRBAC } from '@/hooks/useAdvancedRBAC';
import { handleTileNavigation, getLastUpdatedTimestamp } from '@/utils/navigationHelper';

interface TileProps {
  tile: TileType;
}

export const DashboardTile: React.FC<TileProps> = ({ tile }) => {
  const [mockData, setMockData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated] = useState(getLastUpdatedTimestamp());
  const navigate = useNavigate();
  const { hasPermission } = useRBAC();
  const Icon = Icons[tile.icon as keyof typeof Icons] as React.ComponentType<{ className?: string }>;

  // Handle tile click navigation
  const handleClick = () => {
    if (tile.clickAction) {
      handleTileNavigation(tile.clickAction, hasPermission, navigate);
    }
  };

  const isClickable = !!tile.clickAction;

  // Map tile color theme to gradient
  const getTileGradient = (theme: string): string => {
    const gradients: Record<string, string> = {
      'vibrant-green': 'linear-gradient(135deg, hsl(174 100% 38%) 0%, hsl(174 100% 45%) 100%)',
      'vibrant-blue': 'linear-gradient(135deg, hsl(217 100% 52%) 0%, hsl(188 100% 50%) 100%)',
      'vibrant-cyan': 'linear-gradient(135deg, hsl(188 100% 50%) 0%, hsl(174 100% 45%) 100%)',
      'vibrant-purple': 'linear-gradient(135deg, hsl(258 90% 66%) 0%, hsl(266 85% 75%) 100%)',
      'vibrant-teal': 'linear-gradient(135deg, hsl(173 80% 40%) 0%, hsl(174 100% 38%) 100%)',
      'vibrant-amber': 'linear-gradient(135deg, hsl(38 92% 50%) 0%, hsl(25 95% 53%) 100%)',
      'vibrant-red': 'linear-gradient(135deg, hsl(0 84% 60%) 0%, hsl(0 72% 51%) 100%)',
      'vibrant-orange': 'linear-gradient(135deg, hsl(25 95% 53%) 0%, hsl(38 92% 50%) 100%)',
      'vibrant-pink': 'linear-gradient(135deg, hsl(330 81% 60%) 0%, hsl(336 84% 73%) 100%)',
      'vibrant-lavender': 'linear-gradient(135deg, hsl(258 90% 66%) 0%, hsl(266 85% 80%) 100%)',
      'vibrant-yellow': 'linear-gradient(135deg, hsl(45 93% 47%) 0%, hsl(48 96% 53%) 100%)',
      'vibrant-indigo': 'linear-gradient(135deg, hsl(239 84% 67%) 0%, hsl(243 75% 79%) 100%)',
      'vibrant-gray': 'linear-gradient(135deg, hsl(215 16% 47%) 0%, hsl(218 11% 65%) 100%)',
    };
    return gradients[theme] || 'linear-gradient(135deg, hsl(217 100% 52%) 0%, hsl(174 100% 38%) 100%)';
  };

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
          <div className="space-y-3">
            <div className="text-4xl font-bold text-white">{mockData.value}</div>
            {mockData.trend && (
              <p className="text-sm text-white/80">{mockData.trend}</p>
            )}
            
            {tile.showDetails && mockData.details && (
              <div className="mt-4 space-y-2 pt-3 border-t border-white/20">
                {mockData.details.slice(0, 3).map((item: any, i: number) => (
                  <div key={i} className="text-xs text-white/90 flex justify-between gap-2">
                    <span className="truncate">{item.client}</span>
                    <span className="text-white/70 flex-shrink-0">
                      {item.stage || item.daysOpen ? `${item.daysOpen}d` : item.responsible || ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
            
            {tile.clickAction && mockData.details && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1 mt-2 transition-colors"
              >
                View All <ArrowRight className="h-3 w-3" />
              </button>
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
        const barTotal = barData?.reduce((sum: number, d: any) => sum + d.value, 0) || 1;
        return (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData}>
              <XAxis dataKey="name" stroke="#ffffff80" style={{ fontSize: '12px' }} />
              <YAxis stroke="#ffffff80" style={{ fontSize: '12px' }} />
              <Bar 
                dataKey="value" 
                fill="#ffffff" 
                radius={[4, 4, 0, 0]}
                cursor="pointer"
                onClick={(data: any) => {
                  const label = data?.name;
                  if (!label) return;
                  
                  try {
                    if (tile.id === 'casesByStage') {
                      if (!hasPermission('cases', 'read')) {
                        toast.error('Access Denied', { description: 'You do not have permission to access Cases.' });
                        return;
                      }
                      navigate(`/cases?stage=${encodeURIComponent(label)}`);
                    } else if (tile.id === 'teamPerformance') {
                      if (!hasPermission('employees', 'read')) {
                        toast.error('Access Denied', { description: 'You do not have permission to access Team Performance.' });
                        return;
                      }
                      navigate(`/employees/performance?employee=${encodeURIComponent(label)}`);
                    }
                  } catch (err) {
                    console.error('Bar click navigation error:', err);
                  }
                }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '8px 12px'
                }}
                formatter={(value: number) => {
                  const percentage = ((value / barTotal) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, ''];
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        );

      case 'pieChart':
        const pieData = mockData.labels?.map((label: string, i: number) => ({
          name: label,
          value: mockData.values[i],
        }));
        const COLORS = ['#00C2A8', '#0B5FFF', '#F59E0B', '#EF4444', '#8B5CF6'];
        const pieTotal = pieData?.reduce((sum: number, d: any) => sum + d.value, 0) || 1;
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
                cursor="pointer"
                onClick={(data: any) => {
                  const name = data?.name;
                  if (!name) return;
                  
                  try {
                    if (tile.id === 'clientByCategory') {
                      if (!hasPermission('clients', 'read')) {
                        toast.error('Access Denied', { description: 'You do not have permission to access Clients.' });
                        return;
                      }
                      navigate(`/clients?category=${encodeURIComponent(name)}`);
                    } else if (tile.id === 'hearingOutcomeTrend') {
                      if (!hasPermission('hearings', 'read')) {
                        toast.error('Access Denied', { description: 'You do not have permission to access Hearings.' });
                        return;
                      }
                      navigate(`/hearings/list?outcome=${encodeURIComponent(name)}`);
                    }
                  } catch (err) {
                    console.error('Pie click navigation error:', err);
                  }
                }}
              >
                {pieData?.map((_: any, index: number) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(0, 0, 0, 0.9)', 
                  border: 'none', 
                  borderRadius: '8px',
                  color: '#fff',
                  padding: '8px 12px'
                }}
                formatter={(value: number) => {
                  const percentage = ((value / pieTotal) * 100).toFixed(1);
                  return [`${value} (${percentage}%)`, ''];
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        );

      case 'list':
        return (
          <div className="space-y-2">
            {mockData.slice(0, 4).map((item: any, i: number) => (
              <div key={i} className="flex flex-col text-sm border-b border-white/20 pb-2 last:border-0">
                <span className="text-white font-medium truncate">{item.task}</span>
                <div className="flex justify-between text-xs text-white/70 mt-1">
                  <span className="truncate pr-2">{item.case || 'General'}</span>
                  <span className="flex-shrink-0">{item.due}</span>
                </div>
                {item.assignedTo && (
                  <span className="text-xs text-white/60 mt-0.5">{item.assignedTo}</span>
                )}
              </div>
            ))}
            
            {tile.clickAction && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1 mt-2 transition-colors"
              >
                View All Tasks <ArrowRight className="h-3 w-3" />
              </button>
            )}
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
                <p className="font-medium text-sm truncate">{hearing.client}</p>
                <p className="text-xs text-white/90 truncate">{hearing.case}</p>
                <p className="text-xs text-white/70">
                  {format(new Date(hearing.date), 'MMM dd, yyyy')} • {hearing.time}
                </p>
                <p className="text-xs text-white/60">{hearing.location}</p>
              </div>
            ))}
            
            {tile.clickAction && (
              <button 
                onClick={(e) => { e.stopPropagation(); handleClick(); }}
                className="text-xs text-white/80 hover:text-white flex items-center gap-1 mt-2 transition-colors"
              >
                View Full Calendar <ArrowRight className="h-3 w-3" />
              </button>
            )}
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
    <TooltipProvider>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        whileHover={isClickable ? { scale: 1.02 } : {}}
        whileTap={isClickable ? { scale: 0.98 } : {}}
      >
        <Card 
          className={`hover-lift rounded-2xl shadow-sm border-0 text-white transition-all duration-200 ${
            isClickable ? 'cursor-pointer hover:shadow-lg' : ''
          }`}
          style={{ background: getTileGradient(tile.colorTheme) }}
          onClick={isClickable ? handleClick : undefined}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
              {tile.title}
              {tile.clickAction && (
                <UITooltip>
                  <TooltipTrigger asChild>
                    <ExternalLink className="h-3 w-3 text-white/60 hover:text-white/90 transition-colors" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{tile.clickAction.tooltip || tile.description}</p>
                  </TooltipContent>
                </UITooltip>
              )}
            </CardTitle>
            {Icon && (
              <UITooltip>
                <TooltipTrigger asChild>
                  <div>
                    <Icon className="h-5 w-5 text-white/80" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{tile.description}</p>
                </TooltipContent>
              </UITooltip>
            )}
          </CardHeader>
          <CardContent className="pt-0">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              {renderContent()}
            </motion.div>
            <div className="text-[10px] text-white/50 mt-3 text-right">
              Updated {lastUpdated}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </TooltipProvider>
  );
};
