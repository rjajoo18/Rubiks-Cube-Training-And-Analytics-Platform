from datetime import datetime
from db import db

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    solves = db.relationship("Solve", backref="user", lazy=True)


class Solve(db.Model):
    __tablename__ = "solves"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    state = db.Column(db.String(64), nullable=False)
    solution_moves = db.Column(db.Text, nullable=False)
    num_moves = db.Column(db.Integer, nullable=False)
    source = db.Column(db.String(32), nullable=False)

    solve_time_ms = db.Column(db.Integer, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
