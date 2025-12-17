export function formatMs(ms?: number | null): string {
  if (ms === null || ms === undefined) return 'DNF';

  // Ensure integer milliseconds
  const intMs = Math.floor(ms);

  // Convert to seconds with exactly 3 decimals
  return (intMs / 1000).toFixed(3);
}

export function applyPenalty(timeMs: number | null, penalty: string | null): number | null {
  if (penalty === 'DNF') return null;
  if (timeMs === null) return null;
  if (penalty === '+2') return timeMs + 2000;
  return timeMs;
}

export function formatDisplayTime(timeMs: number | null, penalty: string | null): string {
  if (penalty === 'DNF') return 'DNF';

  const effectiveTime = applyPenalty(timeMs, penalty);
  if (effectiveTime === null) return 'DNF';

  const formatted = formatMs(effectiveTime);
  return penalty === '+2' ? `${formatted}+` : formatted;
}
