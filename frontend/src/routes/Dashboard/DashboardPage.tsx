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
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2">Welcome back, {user?.name}</h1>
        <p className="text-slate-400">Here's your solving progress</p>
      </div>

      <div className="mb-6">
        <Select
          label="Time Range"
          options={[
            { value: '7d', label: 'Last 7 days' },
            { value: '30d', label: 'Last 30 days' },
            { value: '90d', label: 'Last 90 days' },
          ]}
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="max-w-xs"
        />
      </div>

      {loading ? (
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </Card>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card hover className="animate-scale-in">
              <p className="text-sm text-slate-400 mb-1">Total Solves</p>
              <p className="text-3xl font-semibold">{summary.counts.solves}</p>
              <div className="mt-2 text-sm text-slate-500">
                DNF: {summary.counts.dnf} • +2: {summary.counts.plus2}
              </div>
            </Card>

            <Card hover className="animate-scale-in" style={{ animationDelay: '100ms' }}>
              <p className="text-sm text-slate-400 mb-1">Best Time</p>
              <p className="text-3xl font-semibold">{formatMs(summary.timeStats.bestMs)}</p>
              <p className="text-sm text-slate-500 mt-2">Worst: {formatMs(summary.timeStats.worstMs)}</p>
            </Card>

            <Card hover className="animate-scale-in" style={{ animationDelay: '200ms' }}>
              <p className="text-sm text-slate-400 mb-1">Average</p>
              <p className="text-3xl font-semibold">{formatMs(summary.timeStats.avgMs)}</p>
              <p className="text-sm text-slate-500 mt-2">
                Ao5: {formatMs(summary.timeStats.ao5Ms)} • Ao12: {formatMs(summary.timeStats.ao12Ms)}
              </p>
            </Card>
          </div>

          {summary.scoreStats.avgScore !== null && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
              <Card hover>
                <p className="text-sm text-slate-400 mb-1">Average Score</p>
                <p className="text-3xl font-semibold">{summary.scoreStats.avgScore.toFixed(2)}</p>
              </Card>
              <Card hover>
                <p className="text-sm text-slate-400 mb-1">Best Score</p>
                <p className="text-3xl font-semibold">
                  {summary.scoreStats.bestScore?.toFixed(2) || '-'}
                </p>
              </Card>
            </div>
          )}

          <Card className="mb-8">{renderSimpleChart()}</Card>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="primary" onClick={() => navigate('/solve')} className="flex-1">
              Start Timer
            </Button>
            <Button variant="secondary" onClick={() => navigate('/history')} className="flex-1">
              View History
            </Button>
          </div>
        </>
      ) : (
        <Card className="text-center py-16">
          <p className="text-slate-400">No data available for this time range</p>
        </Card>
      )}
    </div>
  );
};

export default DashboardPage;