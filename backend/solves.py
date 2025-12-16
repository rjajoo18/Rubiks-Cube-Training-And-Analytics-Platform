from flask import Blueprint, request, jsonify
from datetime import datetime
from collections import Counter
import random
import base64

from db import db
from models import Solve
from auth import require_auth

# Kociemba is a fast 2-phase Rubik's Cube solver.
# It expects a 54-character cube string in "facelet" form (URFDLB order),
# with each face given row-major, and each sticker a single character.
import kociemba


solves_bp = Blueprint("solves", __name__)

# Legal moves used to generate random scrambles.
MOVES = ["R", "L", "U", "D", "F", "B"]
MODS = ["", "'", "2"]


@solves_bp.route("/ping", methods=["GET"])
def ping():
    """Simple health check route for debugging."""
    return {"ok": True}


# ----------------------------
# SCRAMBLE GENERATION
# ----------------------------
def generate_scramble_3x3(length: int = 20) -> str:
    """
    Generate a random scramble string of the given length.
    NOTE: This is a simple generator that avoids repeating the same face twice in a row.
    It does not enforce WCA scramble rules beyond that.
    """
    scramble = []
    prev_move = None

    for _ in range(length):
        move = random.choice(MOVES)
        while move == prev_move:
            move = random.choice(MOVES)
        mod = random.choice(MODS)
        scramble.append(move + mod)
        prev_move = move

    return " ".join(scramble)


# ----------------------------
# CURSOR PAGINATION HELPERS
# ----------------------------
def encode_cursor(dt: datetime, solve_id: int) -> str:
    """
    Encode the last item's (created_at, id) into a base64 cursor so the client can ask
    for the next page without using offset pagination.
    """
    raw = f"{dt.isoformat()}|{solve_id}".encode("utf-8")
    return base64.urlsafe_b64encode(raw).decode("utf-8")


def decode_cursor(cursor: str):
    """
    Decode a cursor back into (created_at_datetime, solve_id_int).
    """
    raw = base64.urlsafe_b64decode(cursor.encode("utf-8")).decode("utf-8")
    iso, sid = raw.split("|")
    return datetime.fromisoformat(iso), int(sid)


# ----------------------------
# CUBE STATE VALIDATION
# ----------------------------
def validate_cube_state_basic(state: str):
    """
    Basic checks for a 3x3 cube facelet string:
      - Must be exactly 54 characters
      - Must use exactly 6 distinct characters
      - Each distinct character must appear exactly 9 times

    This does NOT guarantee the cube is physically solvable (parity/orientation).
    Kociemba will reject impossible states during solve().
    """
    if not state or len(state) != 54:
        return False, "state must be exactly 54 characters"

    counts = Counter(state)

    if len(counts) != 6:
        return False, f"state must use exactly 6 different colors (found {len(counts)})"

    bad = {c: n for c, n in counts.items() if n != 9}
    if bad:
        return False, f"each color must appear exactly 9 times (bad counts: {bad})"

    return True, None


# ----------------------------
# SERIALIZATION
# ----------------------------
def serialize_solve(s: Solve):
    """
    Convert a Solve SQLAlchemy object into a JSON-friendly dict.
    """
    return {
        "id": s.id,
        "event": s.event,
        "scramble": s.scramble,
        "timeMs": s.time_ms,
        "penalty": s.penalty,
        "notes": s.notes,
        "tags": s.tags,
        "state": s.state,
        "solutionMoves": s.solution_moves,
        "numMoves": s.num_moves,
        "mlScore": s.ml_score,
        "scoreVersion": s.score_version,
        "source": s.source,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
    }


# ----------------------------
# TIME + STATS HELPERS
# ----------------------------
def effective_time_ms(s: Solve):
    """
    Apply penalties to raw time:
      - DNF => None (excluded from averages)
      - +2 => add 2000 ms
      - None => raw time
    """
    if s.penalty == "DNF":
        return None
    if s.time_ms is None:
        return None
    if s.penalty == "+2":
        return s.time_ms + 2000
    return s.time_ms


def compute_live_stats(user_id: int, event: str = "3x3", last_n: int = 200):
    """
    Compute live stats from the user's most recent solves.
    We grab up to last_n solves to keep it fast.
    """
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
        # Standard Ao5: best and worst dropped from 5 solves.
        if len(arr) < 5:
            return None
        w = sorted(arr[:5])
        core = w[1:-1]
        return int(sum(core) / len(core))

    def ao12(arr):
        # Standard Ao12: best and worst dropped from 12 solves.
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


# ----------------------------
# SCORING PLACEHOLDER
# ----------------------------
def heuristic_score(s: Solve) -> float:
    """
    Placeholder scoring function.
    Later you'll replace this with a proper ML model (GBM).
    """
    t = effective_time_ms(s)
    if t is None:
        return 0.0
    return max(0.0, 110.0 - t / 400.0)


# ----------------------------
# API ROUTES
# ----------------------------

# GET /api/scramble?event=3x3
@solves_bp.route("/scramble", methods=["GET"])
@require_auth
def get_scramble():
    """
    Return a new scramble string. For now only 3x3 is supported.
    """
    _user = request.current_user  # forces auth; not used otherwise

    event = request.args.get("event", "3x3")
    if event != "3x3":
        return jsonify({"error": "Only 3x3 supported for now"}), 400

    return jsonify({"scramble": generate_scramble_3x3(), "event": event})


# POST /api/solves
@solves_bp.route("/solves", methods=["POST"])
@require_auth
def create_timed_solve():
    """
    Save a timed solve (from your timer UI).

    Required body fields:
      - scramble
      - timeMs

    Optional:
      - penalty: None | "+2" | "DNF"
      - notes: string
      - tags: array
      - state: 54-char cube string (URFDLB blocks) if you want
      - solutionMoves: array
      - numMoves: int
      - source: default "timer"
    """
    user = request.current_user
    data = request.get_json() or {}

    # Required
    scramble = data.get("scramble")
    time_ms = data.get("timeMs")
    event = data.get("event", "3x3")

    # Optional
    penalty = data.get("penalty")
    notes = data.get("notes", "")
    tags = data.get("tags", [])
    state = data.get("state", "")
    solution_moves = data.get("solutionMoves", [])
    num_moves = data.get("numMoves")
    source = data.get("source", "timer")

    if event != "3x3":
        return jsonify({"error": "Only 3x3 supported for now"}), 400

    if scramble is None:
        return jsonify({"error": "scramble is required"}), 400

    if time_ms is None:
        return jsonify({"error": "timeMs is required"}), 400
    try:
        time_ms = int(time_ms)
    except (ValueError, TypeError):
        return jsonify({"error": "timeMs must be an integer"}), 400

    if penalty not in (None, "+2", "DNF"):
        return jsonify({"error": "penalty must be one of None, '+2', 'DNF'"}), 400

    # Only validate state if user provided it ("" means "not provided")
    if state:
        valid, err = validate_cube_state_basic(state)
        if not valid:
            return jsonify({"error": f"Invalid cube state: {err}"}), 400

    new_solve = Solve(
        user_id=user.id,
        event=event,
        scramble=scramble,
        time_ms=time_ms,
        penalty=penalty,
        notes=notes,
        tags=tags,
        state=state,
        solution_moves=solution_moves,
        num_moves=num_moves,
        ml_score=None,  # computed below
        score_version=None,
        source=source,
        created_at=datetime.utcnow(),
    )

    # Compute heuristic score (placeholder for your ML model later)
    new_solve.ml_score = heuristic_score(new_solve)
    new_solve.score_version = "heuristic_v1"

    db.session.add(new_solve)
    db.session.commit()

    return (
        jsonify(
            {
                "success": True,
                "solve": serialize_solve(new_solve),
                "liveStats": compute_live_stats(user.id, event=event),
            }
        ),
        201,
    )


# GET /api/solves/live-stats?event=3x3
@solves_bp.route("/solves/live-stats", methods=["GET"])
@require_auth
def get_live_stats():
    """
    Return current stats computed from the user's most recent solves.
    """
    user = request.current_user
    event = request.args.get("event", "3x3")
    return jsonify(compute_live_stats(user.id, event=event))


# POST /api/solves/from-state
@solves_bp.route("/solves/from-state", methods=["POST"])
@require_auth
def create_solve_from_state():
    """
    Create a solve from a scanned/entered cube state by computing a solution with kociemba.

    Body example:
      {
        "state": "....54 chars....",  # URFDLB blocks
        "source": "manual",
        "event": "3x3",
        "scramble": "...optional...",
        "notes": "...optional..."
      }

    Saves:
      - state
      - solutionMoves (array of moves)
      - numMoves
    """
    user = request.current_user
    data = request.get_json() or {}

    state = data.get("state")
    source = data.get("source", "manual")
    event = data.get("event", "3x3")
    scramble = data.get("scramble", "")
    notes = data.get("notes", "")

    if event != "3x3":
        return jsonify({"error": "Only 3x3 supported for now"}), 400

    if state is None:
        return jsonify({"error": "state is required"}), 400

    valid, err = validate_cube_state_basic(state)
    if not valid:
        return jsonify({"error": f"Invalid cube state: {err}"}), 400

    # Ask kociemba for a (near-optimal) solution.
    # If the cube state is physically impossible, kociemba will throw an exception.
    try:
        solution_str = kociemba.solve(state)  # e.g. "R U R' U' ..."
        solution_moves = solution_str.split()
    except Exception:
        return jsonify(
            {
                "error": "This cube configuration cannot be solved. Make sure it comes from a valid scramble."
            }
        ), 400

    solve = Solve(
        user_id=user.id,
        event=event,
        scramble=scramble,
        notes=notes,
        state=state,
        solution_moves=solution_moves,
        num_moves=len(solution_moves),
        source=source,
        created_at=datetime.utcnow(),
    )

    db.session.add(solve)
    db.session.commit()

    return jsonify({"solve": serialize_solve(solve)}), 201
