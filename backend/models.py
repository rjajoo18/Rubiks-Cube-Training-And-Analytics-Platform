from datetime import datetime, timezone
from db import db

# Defines User model in table
class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    name = db.Column(db.String(100), nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    solves = db.relationship("Solve", backref="user", lazy=True)


# Defines Solve model in table
class Solve(db.Model):
    __tablename__ = "solves"
    id = db.Column(db.BigInteger, primary_key=True)

    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)

    scramble = db.Column(db.Text, nullable=False)
    time_ms = db.Column(db.Integer, nullable=True)
    penalty = db.Column(db.String(10), nullable=False, default="OK")
    notes = db.Column(db.Text, nullable=True)
    tags = db.Column(db.ARRAY(db.Text), nullable=True)

    state = db.Column(db.Text, nullable=True)
    solution_moves = db.Column(db.Text, nullable=True)
    num_moves = db.Column(db.Integer, nullable=True)

    ml_score = db.Column(db.Float, nullable=True)
    score_version = db.Column(db.String(50), nullable=True)

    source = db.Column(db.String(50), nullable=False, default="timer")
    event = db.Column(db.String(20), nullable=False, default="3x3")

    created_at = db.Column(db.DateTime, default=datetime.utcnow)

