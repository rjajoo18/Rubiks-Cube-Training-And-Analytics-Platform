from flask import Blueprint, request, jsonify
from db import db
from models import Solve
from auth import require_auth
import json

solves_bp = Blueprint("solves", __name__)

# --------------------------
# POST /solve
# --------------------------
@solves_bp.route("/solve", methods=["POST"])
@require_auth
def solve():
    user = request.current_user
    data = request.get_json()

    state = data.get("state")
    source = data.get("source", "manual")

    if not state or len(state) != 54:
        return jsonify({"error": "Invalid cube state"}), 400

    # Placeholder solver until we add real one
    solution_moves = ["U", "R2", "F'"]
    num_moves = len(solution_moves)

    solve_entry = Solve(
        user_id=user.id,
        state=state,
        solution_moves=json.dumps(solution_moves),
        num_moves=num_moves,
        source=source
    )

    db.session.add(solve_entry)
    db.session.commit()

    return jsonify({
        "id": solve_entry.id,
        "moves": solution_moves,
        "numMoves": num_moves
    })

# --------------------------
# GET /solves
# --------------------------
@solves_bp.route("/solves", methods=["GET"])
@require_auth
def list_solves():
    user = request.current_user

    solves = Solve.query.filter_by(user_id=user.id)\
        .order_by(Solve.created_at.desc())\
        .limit(20).all()

    return jsonify([
        {
            "id": s.id,
            "state": s.state,
            "numMoves": s.num_moves,
            "source": s.source,
            "createdAt": s.created_at.isoformat()
        }
        for s in solves
    ])
