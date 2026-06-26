from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime

db = SQLAlchemy()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False)
    has_monitoring = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    claims = db.relationship('Claim', backref='owner', lazy=True)
    orders = db.relationship('Order', backref='user', lazy=True)

class Claim(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # Analysis results
    jurisdiction_name = db.Column(db.String(100))
    jurisdiction_type = db.Column(db.String(50))
    asset_type = db.Column(db.String(100))
    is_scam = db.Column(db.Boolean, default=False)
    confidence = db.Column(db.Float)
    overview = db.Column(db.Text)
    scam_warnings = db.Column(db.Text) # JSON string
    
    # Full kit data (if purchased)
    has_kit = db.Column(db.Boolean, default=False)
    kit_data = db.Column(db.Text) # JSON string
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Order(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    stripe_session_id = db.Column(db.String(200), unique=True)
    item_type = db.Column(db.String(50)) # 'kit' or 'subscription'
    status = db.Column(db.String(20)) # 'pending', 'completed'
    amount = db.Column(db.Integer)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
