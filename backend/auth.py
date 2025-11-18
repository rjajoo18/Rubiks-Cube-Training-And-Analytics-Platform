from flask import Blueprint, request, jsonify
from db import db
from models import User
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import Config
from functools import wraps

auth_bp = Blueprint("auth", __name__)

# --------------------------
# Helper: Create JWT Token
# --------------------------
def create_token(user_id):
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    return jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")

# --------------------------
# Helper: Protect Routes
# --------------------------
def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing token"}), 401

        token = auth_header.split(" ")[1]

        try:
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        except Exception as e:
            return jsonify({"error": "Invalid or expired token"}), 401

        user = User.query.get(payload["sub"])
        if not user:
            return jsonify({"error": "User not found"}), 404

        request.current_user = user
        return f(*args, **kwargs)
    return wrapper

# --------------------------
# POST /signup
# --------------------------
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "Email already exists"}), 400

    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt())

    user = User(email=email, password_hash=hashed.decode())
    db.session.add(user)
    db.session.commit()

    return jsonify({"message": "User created"}), 201

# --------------------------
# POST /login
# --------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()

    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    if not bcrypt.checkpw(password.encode(), user.password_hash.encode()):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_token(user.id)

    return jsonify({"token": token}), 200

# --------------------------
# GET /me
# --------------------------
@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    user = request.current_user
    return jsonify({
        "id": user.id,
        "email": user.email,
        "created_at": user.created_at.isoformat()
    })
