# auth.py
from flask import Blueprint, request, jsonify
from db import db
from models import User
import bcrypt
import jwt
from datetime import datetime, timedelta
from config import Config
from functools import wraps

# This blueprint will handle all /api/auth routes
auth_bp = Blueprint("auth", __name__)

# --------------------------
# Helper: Create JWT Token
# --------------------------
def create_token(user_id):
    payload = {
        "sub": str(user_id),
        "exp": datetime.utcnow() + timedelta(days=7)
    }
    token = jwt.encode(payload, Config.JWT_SECRET_KEY, algorithm="HS256")
    return token

# --------------------------
# Helper: Protect Routes
# --------------------------
def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({'error': 'Missing or invalid Authorization header'}), 401
        
        token = auth_header.split(" ")[1]

        try:
            # Decode and verify JWT token
            payload = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token has expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token!'}), 401
        
        user_id = payload.get("sub")
        if user_id is None:
            return jsonify({'error': 'Invalid token payload'}), 401

        try:
            user_id = int(user_id)  # convert back to int
        except ValueError:
            return jsonify({'error': 'Invalid token payload'}), 401

        user = User.query.get(user_id)
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        request.current_user = user
        return f(*args, **kwargs)
    
    return wrapper

# --------------------------
# POST /signup
# --------------------------
@auth_bp.route("/signup", methods=["POST"])
def signup():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")
    name = data.get("name")

    if not email or not password or not name:
        return jsonify({"error": "Email and password and name are required"}), 400

    existing = User.query.filter_by(email=email).first()
    if existing:
        return jsonify({"error": "Email already exists"}), 400

    # Hash password
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

    user =  User(email=email, name=name, password_hash=hashed_password.decode('utf-8'))
    db.session.add(user)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "User created successfully",
        "user": {
            "id": user.id,
            "email": email,
            "created_at": user.created_at.isoformat()
        }
    }), 201

# --------------------------
# POST /login
# --------------------------
@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}

    email = data.get("email")
    password = data.get("password")

    if not email or not password:
        return jsonify({"error": "Email and password are required"}), 400

    # Find user in database
    user = User.query.filter_by(email=email).first()
    if not user:
        return jsonify({"error": "Invalid credentials"}), 401

    # Verify password
    if not bcrypt.checkpw(password.encode(), user.password_hash.encode("utf-8")):
        return jsonify({"error": "Invalid credentials"}), 401

    # Generate JWT token
    token = create_token(user.id)

    return jsonify({
        "success": True,
        "token": token,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "created_at": user.created_at.isoformat()
        }
    }), 200

# --------------------------
# GET /me
# --------------------------
@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    user = request.current_user
    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "created_at": user.created_at.isoformat()
        }
    }), 200
