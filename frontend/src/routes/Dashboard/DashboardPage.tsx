import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { apiClient } from '@/api/client';
import { DashboardSummary } from '@/types/api';
import { formatMs } from '@/utils/time';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('30d');

  useEffect(() => {
    loadSummary();
  }, [range]);

  const loadSummary = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getDashboardSummary(range);
      setSummary(data);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const renderSimpleChart = () => {
    if (!summary || summary.trend.daily.length === 0) return null;

    const data = summary.trend.daily;
    const maxCount = Math.max(...data.map((d) => d.count));

    return (
      <div className="mt-6">
        <h3 className="text-sm font-medium text-slate-400 mb-4">Daily Trend</h3>
        <div className="space-y-2">
          {data.map((day, idx) => {
            const heightPercent = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
            return (
              <div key={idx} className="flex items-center gap-3">
                <span className="text-xs text-slate-500 w-20">
                  {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
                <div className="flex-1 bg-slate-800 rounded-full h-6 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-purple-500 h-full flex items-center px-2"
                    style={{ width: `${Math.max(heightPercent, 5)}%` }}
                  >
                    <span className="text-xs font-medium">{day.count}</span>
                  </div>
                </div>
                {day.avgMs && (
                  <span className="text-xs text-slate-400 w-16 text-right">{formatMs(day.avgMs)}</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="space-y-6 animate-fade-in">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Welcome back, {user?.name}
            </h1>
            <p className="text-muted-foreground">Here's your solving progress</p>
          </div>

          {/* Time Range Selector */}
          <div className="flex items-center justify-between">
            <div className="w-full max-w-xs">
              <Select
                label="Time Range"
                options={[
                  { value: '7d', label: 'Last 7 days' },
                  { value: '30d', label: 'Last 30 days' },
                  { value: '90d', label: 'Last 90 days' },
                ]}
                value={range}
                onChange={(e) => setRange(e.target.value)}
              />
            </div>
          </div>

          {loading ? (
            <Card className="border border-border/50">
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-primary/30 border-t-primary rounded-full animate-spin" />
              </div>
            </Card>
          ) : summary ? (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card 
                  hover 
                  className="animate-scale-in border border-border/50 bg-card/60 backdrop-blur"
                >
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Total Solves</p>
                    <p className="text-3xl font-bold">{summary.counts.solves}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2 border-t border-border/50">
                      <span>DNF: {summary.counts.dnf}</span>
                      <span>•</span>
                      <span>+2: {summary.counts.plus2}</span>
                    </div>
                  </div>
                </Card>

                <Card 
                  hover 
                  className="animate-scale-in border border-border/50 bg-card/60 backdrop-blur"
                  style={{ animationDelay: '100ms' }}
                >
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Best Time</p>
                    <p className="text-3xl font-bold">{formatMs(summary.timeStats.bestMs)}</p>
                    <p className="text-sm text-muted-foreground pt-2 border-t border-border/50">
                      Worst: {formatMs(summary.timeStats.worstMs)}
                    </p>
                  </div>
                </Card>

                <Card 
                  hover 
                  className="animate-scale-in border border-border/50 bg-card/60 backdrop-blur"
                  style={{ animationDelay: '200ms' }}
                >
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Average</p>
                    <p className="text-3xl font-bold">{formatMs(summary.timeStats.avgMs)}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2 border-t border-border/50">
                      <span>Ao5: {formatMs(summary.timeStats.ao5Ms)}</span>
                      <span>•</span>
                      <span>Ao12: {formatMs(summary.timeStats.ao12Ms)}</span>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Score Stats (if available) */}
              {summary.scoreStats.avgScore !== null && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card hover className="border border-border/50 bg-card/60 backdrop-blur">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-3xl font-bold">{summary.scoreStats.avgScore.toFixed(2)}</p>
                    </div>
                  </Card>
                  <Card hover className="border border-border/50 bg-card/60 backdrop-blur">
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Best Score</p>
                      <p className="text-3xl font-bold">
                        {summary.scoreStats.bestScore?.toFixed(2) || '—'}
                      </p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Chart Card */}
              <Card className="border border-border/50 bg-card/60 backdrop-blur">
                {renderSimpleChart()}
              </Card>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  variant="primary" 
                  onClick={() => navigate('/solve')}
                  className="w-full"
                >
                  Start Timer
                </Button>
                <Button 
                  variant="secondary" 
                  onClick={() => navigate('/history')}
                  className="w-full"
                >
                  View History
                </Button>
              </div>
            </>
          ) : (
            <Card className="text-center py-16 border border-border/50 bg-card/60 backdrop-blur">
              <div className="space-y-3">
                <div className="w-16 h-16 bg-gradient-to-br from-cube-red via-cube-blue to-cube-green rounded-2xl mx-auto opacity-30" />
                <h2 className="text-xl font-semibold">No data available</h2>
                <p className="text-muted-foreground">
                  No solves found for this time range
                </p>
              </div>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;