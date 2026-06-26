import os
import json
import stripe
from flask import Flask, render_template, request, redirect, url_for, flash, session, send_from_directory
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from werkzeug.utils import secure_filename
from config import Config
from models import db, User, Claim, Order
import claim_ai

app = Flask(__name__)
app.config.from_object(Config)
stripe.api_key = app.config['STRIPE_SECRET_KEY']

# Initialize extensions
db.init_app(app)
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login'

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    text_input = request.form.get('text')
    file = request.files.get('file')
    
    file_path = None
    if file and file.filename != '' and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
    
    if not file_path and not text_input:
        flash('No valid file or text provided')
        return redirect(url_for('index'))
    
    # Call real AI analysis
    try:
        analysis_result = claim_ai.analyze_letter(file_path=file_path, text=text_input)
    except Exception as e:
        app.logger.error(f"AI Analysis error: {e}")
        flash("Error processing your letter. Please try again.")
        return redirect(url_for('index'))

    # Store analysis in session or DB
    # For now, let's store it in session to allow guest analysis before login
    session['last_analysis'] = analysis_result
    
    return redirect(url_for('analysis'))

@app.route('/analysis')
def analysis():
    analysis_data = session.get('last_analysis')
    if not analysis_data:
        return redirect(url_for('index'))
    return render_template('analysis.html', analysis=analysis_data)

from utils.stripe_helper import create_checkout_session

@app.route('/checkout/<item_type>')
def checkout(item_type):
    if not current_user.is_authenticated:
        return redirect(url_for('login', next=request.url))
    
    analysis_data = session.get('last_analysis')
    if item_type == 'kit' and not analysis_data:
        flash("Please upload a letter first.")
        return redirect(url_for('index'))
    
    # Create a pending claim or use an existing one
    claim_id = None
    if item_type == 'kit':
        new_claim = Claim(
            user_id=current_user.id,
            jurisdiction_name=analysis_data['jurisdiction'].get('name'),
            jurisdiction_type=analysis_data['jurisdiction'].get('type'),
            asset_type=analysis_data['asset_type'],
            is_scam=analysis_data['is_scam'],
            confidence=analysis_data['confidence'],
            overview=analysis_data['overview'],
            scam_warnings=json.dumps(analysis_data.get('scam_warnings', [])),
            has_kit=False
        )
        db.session.add(new_claim)
        db.session.commit()
        claim_id = new_claim.id
        
    success_url = url_for('payment_success', _external=True) + "?session_id={CHECKOUT_SESSION_ID}"
    if claim_id:
        success_url += f"&claim_id={claim_id}"
        
    cancel_url = url_for('payment_cancel', _external=True)
    session['last_checkout_type'] = item_type
    
    checkout_url = create_checkout_session(
        item_type, 
        current_user.email, 
        success_url, 
        cancel_url,
        metadata={"claim_id": claim_id, "item_type": item_type} if claim_id else {"item_type": item_type}
    )
    
    if checkout_url:
        return redirect(checkout_url)
    else:
        flash("Stripe not configured. Simulating successful payment.")
        mock_session_id = "mock_" + str(os.urandom(8).hex())
        return redirect(success_url.replace("{CHECKOUT_SESSION_ID}", mock_session_id))

@app.route('/payment-success')
@login_required
def payment_success():
    session_id = request.args.get('session_id')
    claim_id = request.args.get('claim_id')
    
    # In mock mode, we manually fulfill the kit
    if session_id and session_id.startswith('mock_'):
        if claim_id:
            claim = Claim.query.get(int(claim_id))
            if claim and not claim.has_kit:
                analysis_data = session.get('last_analysis')
                if not analysis_data:
                    # Reconstruct from DB if session expired
                    analysis_data = {
                        'jurisdiction': {'name': claim.jurisdiction_name, 'type': claim.jurisdiction_type},
                        'asset_type': claim.asset_type,
                        'is_scam': claim.is_scam,
                        'confidence': claim.confidence,
                        'overview': claim.overview,
                        'scam_warnings': json.loads(claim.scam_warnings) if claim.scam_warnings else []
                    }
                
                kit_data = claim_ai.generate_kit_data(analysis_data, {"your_name": current_user.email})
                claim.kit_data = json.dumps(kit_data)
                claim.has_kit = True
                db.session.commit()
                flash("Payment successful! Your claim kit is ready.")
            else:
                flash("Payment successful!")
        
        # Check if this was a subscription
        if session.get('last_checkout_type') == 'subscription':
             current_user.has_monitoring = True
             db.session.commit()
             flash("Subscription successful! Monitoring enabled.")
        
        return redirect(url_for('dashboard'))

    # For real Stripe, we should verify the session here
    # but for this MVP, we'll let the webhook handle the database update
    # and just show a message.
    flash("Payment successful! Your account will be updated shortly.")
    return redirect(url_for('dashboard'))

@app.route('/payment-cancel')
def payment_cancel():
    flash("Payment cancelled.")
    return redirect(url_for('index'))

@app.route('/stripe-webhook', methods=['POST'])
def stripe_webhook():
    payload = request.get_data()
    sig_header = request.environ.get('HTTP_STRIPE_SIGNATURE')
    event = None

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, app.config['STRIPE_WEBHOOK_SECRET']
        )
    except ValueError as e:
        # Invalid payload
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        # Invalid signature
        return 'Invalid signature', 400

    # Handle the checkout.session.completed event
    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        
        # Fulfill the purchase
        metadata = session.get('metadata', {})
        claim_id = metadata.get('claim_id')
        item_type = metadata.get('item_type')
        
        if claim_id and item_type == 'kit':
            claim = Claim.query.get(int(claim_id))
            if claim and not claim.has_kit:
                analysis_data = {
                    'jurisdiction': {'name': claim.jurisdiction_name, 'type': claim.jurisdiction_type},
                    'asset_type': claim.asset_type,
                    'is_scam': claim.is_scam,
                    'confidence': claim.confidence,
                    'overview': claim.overview,
                    'scam_warnings': json.loads(claim.scam_warnings) if claim.scam_warnings else []
                }
                kit_data = claim_ai.generate_kit_data(analysis_data, {"your_name": session.get('customer_email')})
                claim.kit_data = json.dumps(kit_data)
                claim.has_kit = True
                db.session.commit()
                
        # Handle subscription if needed
        elif item_type == 'subscription':
            user = User.query.filter_by(email=session.get('customer_email')).first()
            if user:
                user.has_monitoring = True
                db.session.commit()

    return 'Success', 200

@app.route('/dashboard')
@login_required
def dashboard():
    claims = Claim.query.filter_by(user_id=current_user.id).all()
    return render_template('dashboard.html', claims=claims)

@app.route('/kit/<int:claim_id>')
@login_required
def kit(claim_id):
    claim = Claim.query.get_or_404(claim_id)
    if claim.user_id != current_user.id:
        return "Unauthorized", 403
    
    kit_data = json.loads(claim.kit_data) if claim.kit_data else {}
    return render_template('kit.html', claim=claim, kit=kit_data)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        email = request.form.get('email')
        user = User.query.filter_by(email=email).first()
        if not user:
            user = User(email=email)
            db.session.add(user)
            db.session.commit()
        
        login_user(user)
        next_page = request.args.get('next')
        return redirect(next_page or url_for('dashboard'))
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))

# Command to create database tables
@app.cli.command("init-db")
def init_db():
    db.create_all()
    print("Database initialized.")

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
    app.run(host='0.0.0.0', port=3000, debug=True)
