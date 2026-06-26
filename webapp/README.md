# ClaimVault AI

Turn confusing inheritance/unclaimed-asset letters into a plain-English, step-by-step claim kit.

## Tech Stack
- **Backend:** Flask
- **Frontend:** Bootstrap 5, Jinja2
- **Payments:** Stripe SDK
- **PDF Generation:** WeasyPrint
- **Auth:** Flask-Login (Simple email-based auth)

## Local Setup
1. Create a virtual environment: `python3 -m venv venv`
2. Activate venv: `source venv/bin/activate`
3. Install dependencies: `pip install -r requirements.txt`
4. Copy `.env.example` to `.env` and fill in secrets.
5. Run the app: `python app.py`

## Project Structure
- `app.py`: Main Flask application and routes.
- `config.py`: Configuration and environment variable management.
- `templates/`: Jinja2 HTML templates.
- `static/`: CSS, JS, and uploaded files.
- `utils/`: Helper scripts for Stripe and PDF generation.
- `claim_ai.py`: (TBD) AI processing module.
