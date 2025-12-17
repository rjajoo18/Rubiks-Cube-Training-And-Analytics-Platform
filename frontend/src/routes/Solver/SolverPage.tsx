import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '@/api/client';
import { Solve, LiveStats } from '@/types/api';
import { formatDisplayTime, formatMs } from '@/utils/time';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';

type TimerState = 'idle' | 'ready' | 'running' | 'stopped';

export const SolverPage: React.FC = () => {
  const [scramble, setScramble] = useState<string>('');
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [lastSolve, setLastSolve] = useState<Solve | null>(null);
  const [liveStats, setLiveStats] = useState<LiveStats | null>(null);
  const [penalty, setPenalty] = useState<string>('OK');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Refs so keyboard handlers always see the latest values (no stale closures)
  const startTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const spaceDownTimeRef = useRef<number>(0);

  const timerStateRef = useRef<TimerState>('idle');
  const loadingRef = useRef<boolean>(false);

  useEffect(() => {
    timerStateRef.current = timerState;
  }, [timerState]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const loadNewScramble = useCallback(async () => {
    try {
      const data = await apiClient.getScramble('3x3');
      setScramble(data.scramble);
    } catch {
      setError('Failed to load scramble');
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const stats = await apiClient.getLiveStats('3x3');
      setLiveStats(stats);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, []);

  useEffect(() => {
    void loadNewScramble();
    void loadStats();
  }, [loadNewScramble, loadStats]);

  const saveSolve = useCallback(
    async (timeMs: number) => {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.createSolve({
          scramble,
          timeMs,
          penalty: penalty === 'OK' ? null : penalty,
          source: 'timer',
          notes: notes || undefined,
          event: '3x3',
        });

        setLastSolve(response.solve);
        setLiveStats(response.liveStats);
        setNotes('');
        setPenalty('OK');

        await loadNewScramble();
      } catch {
        setError('Failed to save solve');
      } finally {
        setLoading(false);
      }
    },
    [scramble, penalty, notes, loadNewScramble]
  );

  const startTimer = useCallback(() => {
    if (loadingRef.current) return;

    // stop any existing loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    startTimeRef.current = performance.now();
    setTimerState('running');
    setCurrentTime(0);

    const tick = () => {
      const elapsed = performance.now() - startTimeRef.current;
      setCurrentTime(Math.floor(elapsed));
      animationFrameRef.current = requestAnimationFrame(tick);
    };

    animationFrameRef.current = requestAnimationFrame(tick);
  }, []);

  const stopTimer = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = 0;
    }

    const finalTime = performance.now() - startTimeRef.current;
    setCurrentTime(finalTime);
    setTimerState('stopped');

    void saveSolve(Math.floor(finalTime));
  }, [saveSolve]);

  const handleSpaceDown = useCallback(() => {
    if (loadingRef.current) return;

    const state = timerStateRef.current;
    if (state === 'idle') {
      spaceDownTimeRef.current = Date.now();
      setTimerState('ready');
    } else if (state === 'running') {
      stopTimer();
    }
  }, [stopTimer]);

  const handleSpaceUp = useCallback(() => {
    if (loadingRef.current) return;

    const state = timerStateRef.current;
    if (state === 'ready') {
      const holdTime = Date.now() - spaceDownTimeRef.current;
      if (holdTime >= 300) {
        startTimer();
      } else {
        setTimerState('idle');
      }
    }
  }, [startTimer]);

  // IMPORTANT: register key listeners ONCE. Do NOT cancel RAF here.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleSpaceDown();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        handleSpaceUp();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleSpaceDown, handleSpaceUp]);

  // Optional: cancel RAF only when leaving the page
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = 0;
      }
    };
  }, []);

  const handleManualStart = () => {
    if (loading) return;

    if (timerState === 'idle') {
      startTimer();
    } else if (timerState === 'running') {
      stopTimer();
    }
  };

  const handleScoreSolve = async (solveId: number) => {
    try {
      const result = await apiClient.scoreSolve(solveId);
      setLastSolve((prev) =>
        prev && prev.id === solveId
          ? { ...prev, mlScore: result.mlScore, scoreVersion: result.scoreVersion }
          : prev
      );
    } catch {
      setError('Failed to score solve');
    }
  };

  const getTimerColor = () => {
    if (timerState === 'ready') return 'text-green-400';
    if (timerState === 'running') return 'text-white';
    if (timerState === 'stopped') return 'text-blue-400';
    return 'text-slate-400';
  };

  const showSavingBanner = loading && timerState === 'stopped';

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2">Timer</h1>
        <p className="text-slate-400">Press and hold spacebar to start</p>
      </div>

      {error && (
        <Card className="bg-red-900/20 border-red-800 mb-6">
          <p className="text-red-400">{error}</p>
        </Card>
      )}

      {showSavingBanner && (
        <Card className="mb-6">
          <p className="text-slate-300">Saving solve...</p>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card className="text-center">
            <div className="mb-6">
              <p className="text-sm text-slate-400 mb-2">Scramble</p>
              <p className="text-lg md:text-xl font-mono text-slate-200">{scramble}</p>
              <Button
                variant="ghost"
                onClick={loadNewScramble}
                className="mt-3"
                disabled={timerState === 'running' || loading}
              >
                {loading ? 'Saving...' : 'New Scramble'}
              </Button>
            </div>

            <div className={`text-6xl md:text-8xl font-bold mb-6 transition-colors ${getTimerColor()}`}>
              {formatMs(currentTime)}
            </div>

            <div className="flex justify-center gap-3 mb-6">
              <Button
                variant={timerState === 'running' ? 'secondary' : 'primary'}
                onClick={handleManualStart}
                disabled={timerState === 'stopped' || loading}
              >
                {timerState === 'running' ? 'Stop' : 'Start'}
              </Button>

              {timerState === 'stopped' && (
                <Button variant="ghost" onClick={() => setTimerState('idle')} disabled={loading}>
                  Reset
                </Button>
              )}
            </div>

            {timerState === 'stopped' && (
              <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="grid grid-cols-3 gap-3">
                  <Button
                    variant={penalty === 'OK' ? 'primary' : 'ghost'}
                    onClick={() => setPenalty('OK')}
                    disabled={loading}
                  >
                    OK
                  </Button>
                  <Button
                    variant={penalty === '+2' ? 'primary' : 'ghost'}
                    onClick={() => setPenalty('+2')}
                    disabled={loading}
                  >
                    +2
                  </Button>
                  <Button
                    variant={penalty === 'DNF' ? 'primary' : 'ghost'}
                    onClick={() => setPenalty('DNF')}
                    disabled={loading}
                  >
                    DNF
                  </Button>
                </div>

                <Input
                  placeholder="Notes (optional)"
                  value={notes}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotes(e.target.value)}
                  disabled={loading}
                />
              </div>
            )}
          </Card>

          {lastSolve && (
            <Card>
              <h3 className="text-lg font-semibold mb-4">Last Solve</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Time</span>
                  <Badge variant="info">{formatDisplayTime(lastSolve.timeMs, lastSolve.penalty)}</Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Date</span>
                  <span className="text-sm">{new Date(lastSolve.createdAt).toLocaleString()}</span>
                </div>

                {lastSolve.mlScore !== null && (
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Score</span>
                    <Badge variant="success">{lastSolve.mlScore.toFixed(2)}</Badge>
                  </div>
                )}

                {lastSolve.mlScore === null && (
                  <Button
                    variant="secondary"
                    onClick={() => handleScoreSolve(lastSolve.id)}
                    className="w-full"
                    disabled={loading}
                  >
                    Score This Solve
                  </Button>
                )}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Live Stats</h3>
              <Button variant="ghost" onClick={loadStats} className="text-xs" disabled={loading}>
                Refresh
              </Button>
            </div>

            {liveStats && (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-slate-400">Count</span>
                  <span>{liveStats.count}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Best</span>
                  <span>{formatMs(liveStats.bestMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Worst</span>
                  <span>{formatMs(liveStats.worstMs)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ao5</span>
                  <span>{formatMs(liveStats.ao5Ms)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ao12</span>
                  <span>{formatMs(liveStats.ao12Ms)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Average</span>
                  <span>{formatMs(liveStats.avgMs)}</span>
                </div>
                {liveStats.avgScore !== null && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Avg Score</span>
                    <span>{liveStats.avgScore.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};

export default SolverPage;
