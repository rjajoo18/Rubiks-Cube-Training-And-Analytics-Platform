import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { getSolves, Solve } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSolves = async () => {
      try {
        const data = await getSolves();
        setSolves(data);
      } catch (error) {
        console.error('Failed to fetch solves:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchSolves();
  }, []);

  const stats = {
    lastSolve: solves[0]?.numMoves || 0,
    bestSolve: solves.length > 0 ? Math.min(...solves.map(s => s.numMoves)) : 0,
    totalSolves: solves.length,
  };

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2">
          Welcome back, {user?.name}
        </h1>
        <p className="text-slate-400">Ready to solve some cubes?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card hover className="animate-scale-in" style={{ animationDelay: '0ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Last Solve</p>
              <p className="text-3xl font-semibold">
                {loading ? '-' : stats.lastSolve > 0 ? `${stats.lastSolve}` : '-'}
              </p>
              <p className="text-sm text-slate-500 mt-1">moves</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card hover className="animate-scale-in" style={{ animationDelay: '100ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Best Solve</p>
              <p className="text-3xl font-semibold">
                {loading ? '-' : stats.bestSolve > 0 ? `${stats.bestSolve}` : '-'}
              </p>
              <p className="text-sm text-slate-500 mt-1">moves</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card hover className="animate-scale-in" style={{ animationDelay: '200ms' }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-slate-400 mb-1">Total Solves</p>
              <p className="text-3xl font-semibold">
                {loading ? '-' : stats.totalSolves}
              </p>
              <p className="text-sm text-slate-500 mt-1">completed</p>
            </div>
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {solves.length > 0 && (
        <Card className="mb-8 animate-fade-in" style={{ animationDelay: '300ms' }}>
          <h2 className="text-xl font-semibold mb-4">Your Last Solve</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Moves</span>
              <Badge variant="info">{solves[0].numMoves} moves</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Date</span>
              <span className="text-slate-300">
                {new Date(solves[0].createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Source</span>
              <Badge variant="default">{solves[0].source}</Badge>
            </div>
            <div className="mt-4 p-4 bg-slate-950/50 rounded-lg">
              <p className="text-xs text-slate-500 mb-2">Solution</p>
              <code className="text-sm text-slate-300 font-mono break-all">
                {solves[0].moves}
              </code>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-4">
        <Button
          variant="primary"
          onClick={() => navigate('/solve')}
          className="flex-1"
        >
          Solve a new cube
        </Button>
        <Button
          variant="secondary"
          onClick={() => navigate('/history')}
          className="flex-1"
        >
          View solve history
        </Button>
      </div>
    </div>
  );
};

export default DashboardPage;