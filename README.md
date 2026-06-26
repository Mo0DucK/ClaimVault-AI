# ClaimVault AI

Turn confusing inheritance and unclaimed-asset letters into a plain-English, step-by-step claim kit with auto-filled forms, scam verification, and direct .gov links.

## Project Structure

- `webapp/`: Flask web application for user interaction, file uploads, and kit delivery.
- `ai_pipeline/`: Core AI logic including OCR, document classification, scam detection, and guide generation.
- `knowledge_base/`: JSON-based knowledge base of US states and international claim jurisdictions.
- `monitoring/`: Scrapers and match detectors for automated unclaimed property monitoring.

## Features

- **Free Tier:** AI analysis of uploaded letters, scam verification, and process overview.
- **One-Time Kit ($79):** Personalized claim package with auto-filled forms and instructions.
- **Monitoring Subscription ($149/yr):** Automated quarterly search across 50+ jurisdictions.

## Tech Stack

- **Backend:** Flask, Flask-SQLAlchemy, Flask-Login
- **AI:** Google Gemini Flash, Tesseract OCR
- **PDF Generation:** WeasyPrint
- **Payments:** Stripe
- **Monitoring:** Node.js, Puppeteer/Chrome-Pilot
