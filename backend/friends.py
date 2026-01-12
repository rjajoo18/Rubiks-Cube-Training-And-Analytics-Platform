from flask import Blueprint, request, jsonify
from datetime import datetime

from db import db
from models import Solve, User, FriendRequests, Friends
from auth import require_auth
from services.stats import compute_live_stats, effective_time_ms  # use shared helpers


friends_bp = Blueprint("friends", __name__)


# ----------------------------
# SERIALIZATION
# ----------------------------
def serialize_user_basic(u: User):
    return {
        "id": u.id,
        "name": u.name,
        "email": u.email,
    }


def serialize_friend_request_outgoing(fr: FriendRequests, to_user: User):
    return {
        "id": fr.id,
        "status": fr.status,
        "createdAt": fr.created_at.isoformat() if fr.created_at else None,
        "respondedAt": fr.responded_at.isoformat() if fr.responded_at else None,
        "toUser": serialize_user_basic(to_user),
    }


def serialize_friend_request_incoming(fr: FriendRequests, from_user: User):
    return {
        "id": fr.id,
        "status": fr.status,
        "createdAt": fr.created_at.isoformat() if fr.created_at else None,
        "respondedAt": fr.responded_at.isoformat() if fr.responded_at else None,
        "fromUser": serialize_user_basic(from_user),
    }


def serialize_friend_row(friend_user: User):
    return serialize_user_basic(friend_user)


def serialize_solve_min(s: Solve):
    """
    Minimal solve payload for friend feed.
    Keep it light to avoid overfetch.
    """
    return {
        "id": s.id,
        "timeMs": s.time_ms,
        "penalty": s.penalty,
        "effectiveTimeMs": effective_time_ms(s),
        "mlScore": s.ml_score,
        "createdAt": s.created_at.isoformat() if s.created_at else None,
    }


# ----------------------------
# API ROUTES
# ----------------------------

# POST /api/friends/requests
@friends_bp.route("/friends/requests", methods=["POST"])
@require_auth
def create_friend_request():
    me = request.current_user
    data = request.get_json() or {}

    email = (data.get("email") or "").strip().lower()
    if not email:
        return jsonify({"error": "email is required"}), 400

    target = User.query.filter_by(email=email).first()
    if not target:
        return jsonify({"error": "User not found"}), 404

    if target.id == me.id:
        return jsonify({"error": "Cannot send a friend request to yourself"}), 400

    existing_friend = Friends.query.filter_by(user_id=me.id, friend_user_id=target.id).first()
    if existing_friend:
        return jsonify({"error": "Already friends"}), 409

    existing_outgoing = FriendRequests.query.filter_by(
        from_user_id=me.id, to_user_id=target.id, status="pending"
    ).first()
    if existing_outgoing:
        return jsonify({"error": "Friend request already sent"}), 409

    existing_incoming = FriendRequests.query.filter_by(
        from_user_id=target.id, to_user_id=me.id, status="pending"
    ).first()
    if existing_incoming:
        return jsonify({"error": "You already have an incoming request from this user"}), 409

    fr = FriendRequests(
        from_user_id=me.id,
        to_user_id=target.id,
        status="pending",
        created_at=datetime.utcnow(),
    )
    db.session.add(fr)

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to create friend request"}), 500

    return jsonify({
        "success": True,
        "request": {
            "id": fr.id,
            "status": fr.status,
            "createdAt": fr.created_at.isoformat() if fr.created_at else None,
            "toUser": serialize_user_basic(target),
        }
    }), 201


# GET /api/friends/requests/incoming
@friends_bp.route("/friends/requests/incoming", methods=["GET"])
@require_auth
def list_incoming_friend_requests():
    me = request.current_user

    incoming = (
        FriendRequests.query
        .filter_by(to_user_id=me.id, status="pending")
        .order_by(FriendRequests.created_at.desc(), FriendRequests.id.desc())
        .all()
    )

    from_ids = [fr.from_user_id for fr in incoming]
    from_users = User.query.filter(User.id.in_(from_ids)).all() if from_ids else []
    by_id = {u.id: u for u in from_users}

    items = []
    for fr in incoming:
        sender = by_id.get(fr.from_user_id)
        if sender:
            items.append(serialize_friend_request_incoming(fr, sender))

    return jsonify({"items": items})


# GET /api/friends/requests/outgoing
@friends_bp.route("/friends/requests/outgoing", methods=["GET"])
@require_auth
def list_outgoing_friend_requests():
    me = request.current_user

    outgoing = (
        FriendRequests.query
        .filter_by(from_user_id=me.id, status="pending")
        .order_by(FriendRequests.created_at.desc(), FriendRequests.id.desc())
        .all()
    )

    to_ids = [fr.to_user_id for fr in outgoing]
    to_users = User.query.filter(User.id.in_(to_ids)).all() if to_ids else []
    by_id = {u.id: u for u in to_users}

    items = []
    for fr in outgoing:
        target = by_id.get(fr.to_user_id)
        if target:
            items.append(serialize_friend_request_outgoing(fr, target))

    return jsonify({"items": items})


# POST /api/friends/requests/<int:request_id>/accept
@friends_bp.route("/friends/requests/<int:request_id>/accept", methods=["POST"])
@require_auth
def accept_friend_request(request_id: int):
    me = request.current_user

    fr = FriendRequests.query.filter_by(id=request_id).first()
    if not fr:
        return jsonify({"error": "Friend request not found"}), 404

    if fr.to_user_id != me.id:
        return jsonify({"error": "Not authorized"}), 403

    if fr.status != "pending":
        return jsonify({"error": "Friend request is not pending"}), 409

    other_id = fr.from_user_id
    other_user = User.query.get(other_id)
    if not other_user:
        return jsonify({"error": "User not found"}), 404

    fr.status = "accepted"
    fr.responded_at = datetime.utcnow()

    # Insert friendships if missing (avoid unique constraint crashes)
    a_to_b = Friends.query.filter_by(user_id=me.id, friend_user_id=other_id).first()
    b_to_a = Friends.query.filter_by(user_id=other_id, friend_user_id=me.id).first()

    if not a_to_b:
        db.session.add(Friends(user_id=me.id, friend_user_id=other_id, created_at=datetime.utcnow()))
    if not b_to_a:
        db.session.add(Friends(user_id=other_id, friend_user_id=me.id, created_at=datetime.utcnow()))

    # Optional cleanup: cancel reverse pending request (me -> them)
    reverse = FriendRequests.query.filter_by(
        from_user_id=me.id, to_user_id=other_id, status="pending"
    ).first()
    if reverse:
        reverse.status = "canceled"
        reverse.responded_at = datetime.utcnow()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to accept friend request"}), 500

    return jsonify({"success": True, "friend": serialize_user_basic(other_user)})


# POST /api/friends/requests/<int:request_id>/decline
@friends_bp.route("/friends/requests/<int:request_id>/decline", methods=["POST"])
@require_auth
def decline_friend_request(request_id: int):
    me = request.current_user

    fr = FriendRequests.query.filter_by(id=request_id).first()
    if not fr:
        return jsonify({"error": "Friend request not found"}), 404

    if fr.to_user_id != me.id:
        return jsonify({"error": "Not authorized"}), 403

    if fr.status != "pending":
        return jsonify({"error": "Friend request is not pending"}), 409

    fr.status = "declined"
    fr.responded_at = datetime.utcnow()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to decline friend request"}), 500

    return jsonify({"success": True})


# DELETE /api/friends/requests/<int:request_id>  (cancel outgoing)
@friends_bp.route("/friends/requests/<int:request_id>", methods=["DELETE"])
@require_auth
def cancel_friend_request(request_id: int):
    me = request.current_user

    fr = FriendRequests.query.filter_by(id=request_id).first()
    if not fr:
        return jsonify({"error": "Friend request not found"}), 404

    if fr.from_user_id != me.id:
        return jsonify({"error": "Not authorized"}), 403

    if fr.status != "pending":
        return jsonify({"error": "Friend request is not pending"}), 409

    # Soft-cancel (keep history)
    fr.status = "canceled"
    fr.responded_at = datetime.utcnow()

    try:
        db.session.commit()
    except Exception:
        db.session.rollback()
        return jsonify({"error": "Failed to cancel friend request"}), 500

    return jsonify({"success": True})


# GET /api/friends
@friends_bp.route("/friends", methods=["GET"])
@require_auth
def list_friends():
    me = request.current_user

    friendships = (
        Friends.query
        .filter_by(user_id=me.id)
        .order_by(Friends.created_at.desc(), Friends.id.desc())
        .all()
    )

    friend_ids = [f.friend_user_id for f in friendships]
    friend_users = User.query.filter(User.id.in_(friend_ids)).all() if friend_ids else []
    by_id = {u.id: u for u in friend_users}

    items = []
    for f in friendships:
        friend_user = by_id.get(f.friend_user_id)
        if friend_user:
            items.append(serialize_friend_row(friend_user))

    return jsonify({"items": items})


# GET /api/friends/<friend_id>/summary
@friends_bp.route("/friends/<int:friend_id>/summary", methods=["GET"])
@require_auth
def get_friend_summary(friend_id: int):
    me = request.current_user

    friendship = Friends.query.filter_by(user_id=me.id, friend_user_id=friend_id).first()
    if not friendship:
        return jsonify({"error": "Not friends with this user"}), 403

    friend_user = User.query.get(friend_id)
    if not friend_user:
        return jsonify({"error": "User not found"}), 404

    # Reuse same stats shape you use elsewhere
    stats = compute_live_stats(friend_id, event="3x3", last_n=200)

    recent_solves = (
        Solve.query
        .filter_by(user_id=friend_id, event="3x3")
        .order_by(Solve.created_at.desc(), Solve.id.desc())
        .limit(10)
        .all()
    )

    return jsonify({
        "user": serialize_user_basic(friend_user),
        "stats": stats,
        "recentSolves": [serialize_solve_min(s) for s in recent_solves],
    })
