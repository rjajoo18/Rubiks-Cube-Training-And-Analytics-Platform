from models import Solve

def effective_time_ms(s: Solve):
    if s.penalty == "DNF":
        return None
    if s.time_ms is None:
        return None
    if s.penalty == "+2":
        return s.time_ms + 2000
    return s.time_ms


def compute_live_stats(user_id: int, event: str = "3x3", last_n: int = 200):
    base = Solve.query.filter_by(user_id=user_id, event=event)

    recent = (
        base.order_by(Solve.created_at.desc(), Solve.id.desc())
        .limit(last_n)
        .all()
    )

    times = []
    scores = []

    for s in recent:
        et = effective_time_ms(s)
        if et is not None:
            times.append(et)
        if s.ml_score is not None:
            scores.append(s.ml_score)

    def avg_int(arr):
        if not arr:
            return None
        return sum(arr) // len(arr)

    def ao5(arr):
        if len(arr) < 5:
            return None
        w = sorted(arr[:5])
        core = w[1:-1]
        return int(sum(core) / len(core))

    def ao12(arr):
        if len(arr) < 12:
            return None
        w = sorted(arr[:12])
        core = w[1:-1]
        return int(sum(core) / len(core))

    return {
        "count": base.count(),
        "bestMs": min(times) if times else None,
        "worstMs": max(times) if times else None,
        "ao5Ms": ao5(times),
        "ao12Ms": ao12(times),
        "avgMs": avg_int(times),
        "avgScore": (sum(scores) / len(scores)) if scores else None,
    }
