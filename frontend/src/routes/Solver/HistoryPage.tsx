import React, { useEffect, useState } from "react";
import { apiClient } from "@/api/client";
import { Solve } from "@/types/api";
import { formatDisplayTime } from "@/utils/time";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

type SolveListParams = {
  limit: number;
  cursor?: string;
  penalty?: string;
  source?: string;
  hasScore?: boolean;
  hasSolution?: boolean;
  from?: string;
  to?: string;
};

export const HistoryPage: React.FC = () => {
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [selectedSolve, setSelectedSolve] = useState<Solve | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editPenalty, setEditPenalty] = useState("");

  const [filters, setFilters] = useState({
    penalty: "",
    source: "",
    hasScore: false,
    hasSolution: false,
    from: "",
    to: "",
  });

  useEffect(() => {
    loadSolves(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const loadSolves = async (reset: boolean = false) => {
    setLoading(true);
    try {
      const params: SolveListParams = { limit: 50 };
      if (!reset && nextCursor) params.cursor = nextCursor;
      if (filters.penalty) params.penalty = filters.penalty;
      if (filters.source) params.source = filters.source;
      if (filters.hasScore) params.hasScore = true;
      if (filters.hasSolution) params.hasSolution = true;
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;

      const data = await apiClient.getSolves(params);

      if (reset) {
        setSolves(data.items);
      } else {
        setSolves((prev) => [...prev, ...data.items]);
      }

      setNextCursor(data.nextCursor);
    } catch (err) {
      console.error("Failed to fetch solves:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (solve: Solve) => {
    try {
      const response = await apiClient.getSolve(solve.id);
      setSelectedSolve(response.solve);
      setEditNotes(response.solve.notes || "");
      setEditPenalty(response.solve.penalty || "OK");
      setIsModalOpen(true);
    } catch (err) {
      console.error("Failed to load solve details:", err);
    }
  };

  const handleUpdateSolve = async () => {
    if (!selectedSolve) return;
    try {
      const response = await apiClient.updateSolve(selectedSolve.id, {
        penalty: editPenalty === "OK" ? null : editPenalty,
        notes: editNotes,
      });

      setSolves((prev) => prev.map((s) => (s.id === selectedSolve.id ? response.solve : s)));
      setSelectedSolve(response.solve);
    } catch (err) {
      console.error("Failed to update solve:", err);
    }
  };

  const handleDeleteSolve = async (id: number) => {
    if (!confirm("Are you sure you want to delete this solve?")) return;
    try {
      await apiClient.deleteSolve(id);
      setSolves((prev) => prev.filter((s) => s.id !== id));
      setIsModalOpen(false);
    } catch (err) {
      console.error("Failed to delete solve:", err);
    }
  };

  const handleScoreSolve = async (id: number) => {
    try {
      const result = await apiClient.scoreSolve(id);

      setSolves((prev) =>
        prev.map((s) =>
          s.id === id ? { ...s, mlScore: result.mlScore, scoreVersion: result.scoreVersion } : s
        )
      );

      setSelectedSolve((prev) =>
        prev && prev.id === id
          ? { ...prev, mlScore: result.mlScore, scoreVersion: result.scoreVersion }
          : prev
      );
    } catch (err) {
      console.error("Failed to score solve:", err);
    }
  };

  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading && solves.length === 0) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-semibold mb-8">History</h1>
        <Card>
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-semibold mb-2">History</h1>
        <p className="text-slate-400">{solves.length} solves loaded</p>
      </div>

      <Card className="mb-6">
        <h3 className="text-lg font-semibold mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Select
            label="Penalty"
            options={[
              { value: "", label: "All" },
              { value: "OK", label: "OK" },
              { value: "+2", label: "+2" },
              { value: "DNF", label: "DNF" },
            ]}
            value={filters.penalty}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters({ ...filters, penalty: e.target.value })
            }
          />
          <Select
            label="Source"
            options={[
              { value: "", label: "All" },
              { value: "timer", label: "Timer" },
              { value: "manual", label: "Manual" },
            ]}
            value={filters.source}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              setFilters({ ...filters, source: e.target.value })
            }
          />
          <div className="flex items-end gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={filters.hasScore}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, hasScore: e.target.checked })
                }
                className="rounded"
              />
              Has Score
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <input
                type="checkbox"
                checked={filters.hasSolution}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFilters({ ...filters, hasSolution: e.target.checked })
                }
                className="rounded"
              />
              Has Solution
            </label>
          </div>
        </div>
      </Card>

      {solves.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-16 h-16 bg-gradient-to-br from-cube-red via-cube-blue to-cube-green rounded-2xl mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-semibold mb-2">No solves found</h2>
          <p className="text-slate-400">Try adjusting your filters or solve a new cube!</p>
        </Card>
      ) : (
        <>
          <div className="space-y-4 mb-6">
            {solves.map((solve, index) => (
              <Card
                key={solve.id}
                hover
                className="animate-scale-in cursor-pointer"
                style={{ animationDelay: `${index * 30}ms` }}
                onClick={() => handleViewDetails(solve)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="hidden sm:block w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <Badge variant="info">{formatDisplayTime(solve.timeMs, solve.penalty)}</Badge>
                        <Badge variant="default">{solve.source}</Badge>
                        {solve.mlScore !== null && (
                          <Badge variant="success">Score: {solve.mlScore.toFixed(2)}</Badge>
                        )}
                        {solve.numMoves && <Badge variant="info">{solve.numMoves} moves</Badge>}
                      </div>
                      <p className="text-sm text-slate-400">{formatDate(solve.createdAt)}</p>
                      <p className="text-sm text-slate-500 mt-1 truncate">{solve.scramble}</p>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {nextCursor && (
            <div className="text-center">
              <Button variant="secondary" onClick={() => loadSolves(false)} disabled={loading}>
                {loading ? "Loading..." : "Load More"}
              </Button>
            </div>
          )}
        </>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Solve Details">
        {selectedSolve && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-slate-400 mb-2">Time</p>
              <Badge variant="info">{formatDisplayTime(selectedSolve.timeMs, selectedSolve.penalty)}</Badge>
            </div>

            <div>
              <p className="text-sm text-slate-400 mb-2">Scramble</p>
              <code className="text-sm text-slate-300 font-mono break-all">{selectedSolve.scramble}</code>
            </div>

            {selectedSolve.solutionMoves && (
              <div>
                <p className="text-sm text-slate-400 mb-2">Solution</p>
                <code className="text-sm text-slate-300 font-mono break-all">{selectedSolve.solutionMoves}</code>
              </div>
            )}

            <div>
              <Select
                label="Penalty"
                options={[
                  { value: "OK", label: "OK" },
                  { value: "+2", label: "+2" },
                  { value: "DNF", label: "DNF" },
                ]}
                value={editPenalty}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setEditPenalty(e.target.value)}
              />
            </div>

            <div>
              <Input
                label="Notes"
                value={editNotes}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditNotes(e.target.value)}
                placeholder="Add notes..."
              />
            </div>

            <div className="flex gap-3">
              <Button variant="primary" onClick={handleUpdateSolve} className="flex-1">
                Update
              </Button>

              {selectedSolve.mlScore === null && (
                <Button variant="secondary" onClick={() => handleScoreSolve(selectedSolve.id)} className="flex-1">
                  Score
                </Button>
              )}

              <Button
                variant="ghost"
                onClick={() => handleDeleteSolve(selectedSolve.id)}
                className="text-red-400 hover:text-red-300"
              >
                Delete
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default HistoryPage;
