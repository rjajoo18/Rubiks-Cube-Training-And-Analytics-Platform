import React, { useEffect, useState } from "react";
import { getSolves, Solve } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export const HistoryPage: React.FC = () => {
  const [solves, setSolves] = useState<Solve[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    const fetchSolves = async () => {
      try {
        const data = await getSolves();
        // be defensive in case API returns null/undefined
        setSolves(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to fetch solves:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSolves();
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const formatDate = (value: unknown): string => {
    if (!value) return "Unknown date";
    const date = new Date(String(value));
    if (isNaN(date.getTime())) return "Unknown date";

    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getPreviewMoves = (moves: unknown): string => {
    const movesStr = typeof moves === "string" ? moves : "";
    if (!movesStr.trim()) return "";

    const parts = movesStr.trim().split(/\s+/);
    const preview = parts.slice(0, 6).join(" ");
    return parts.length > 6 ? `${preview}...` : preview;
  };

  if (loading) {
    return (
      <div className="animate-fade-in">
        <h1 className="text-3xl md:text-4xl font-semibold mb-8">
          Solve History
        </h1>
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
        <h1 className="text-3xl md:text-4xl font-semibold mb-2">
          Solve History
        </h1>
        <p className="text-slate-400">
          {solves.length} {solves.length === 1 ? "solve" : "solves"} completed
        </p>
      </div>

      {solves.length === 0 ? (
        <Card className="text-center py-16">
          <div className="w-16 h-16 bg-gradient-to-br from-cube-red via-cube-blue to-cube-green rounded-2xl mx-auto mb-4 opacity-30" />
          <h2 className="text-xl font-semibold mb-2">No solves yet</h2>
          <p className="text-slate-400 mb-6">
            Try solving your first cube to see it appear here!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {solves.map((solve, index) => (
            <Card
              key={solve.id}
              hover
              className="animate-scale-in cursor-pointer"
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => toggleExpand(solve.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="hidden sm:block w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <Badge variant="info">
                        {solve.numMoves ?? "?"} moves
                      </Badge>
                      <Badge variant="default">
                        {solve.source || "manual"}
                      </Badge>
                    </div>
                    <p className="text-sm text-slate-400">
                      {formatDate(solve.createdAt)}
                    </p>
                    {!expandedId && (
                      <p className="text-sm text-slate-500 mt-2 font-mono truncate">
                        {getPreviewMoves(solve.moves)}
                      </p>
                    )}
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-400 transition-transform duration-200 flex-shrink-0 ${
                    expandedId === solve.id ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </div>

              {expandedId === solve.id && (
                <div className="mt-4 pt-4 border-t border-white/5 animate-fade-in">
                  <div className="mb-3">
                    <p className="text-xs text-slate-500 mb-2">Cube State</p>
                    <code className="text-sm text-slate-400 font-mono break-all">
                      {solve.state || "(no state recorded)"}
                    </code>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-2">
                      Full Move Sequence
                    </p>
                    <code className="text-base text-slate-100 font-mono break-all leading-relaxed">
                      {typeof solve.moves === "string"
                        ? solve.moves
                        : "(no moves recorded)"}
                    </code>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryPage;
