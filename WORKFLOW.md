<!-- managed:linked-repos -->
## Linked Repositories
- Mo0DucK/ClaimVault-AI
<!-- /managed:linked-repos -->

# ClaimVault AI — Code Workflow

## Repository
`Mo0DucK/ClaimVault-AI`

## Branch Strategy
- `main` — production-ready, deployable code. Protected.
- `feat/*` — feature branches for new work.
- `fix/*` — bug fix branches.

## Process
1. Create a feature branch from `main`: `git checkout -b feat/my-feature`
2. Work and commit with clear messages
3. Push and open a pull request
4. The team lead reviews and merges via squash

## Project Structure
```
claimvault-ai/
├── webapp/                 # Flask web application
│   ├── app.py              # Main application
│   ├── claim_ai.py         # AI pipeline orchestrator
│   ├── classifier.py       # Gemini classification
│   ├── ocr.py              # OCR module
│   ├── scam_detector.py    # Scam detection
│   ├── guide_generator.py  # Guide generation
│   ├── models.py           # Database models
│   ├── config.py           # Configuration
│   ├── templates/          # Jinja2 templates
│   ├── static/             # CSS, JS, uploads
│   ├── utils/              # Stripe helper, PDF gen
│   └── requirements.txt    # Python dependencies
├── knowledge_base/         # Structured data assets
│   ├── state_unclaimed_property.json
│   ├── international_claims.json
│   └── scam_database.json
├── ai_pipeline/            # Standalone AI pipeline
│   ├── claim_ai.py
│   ├── classifier.py
│   ├── ocr.py
│   ├── scam_detector.py
│   └── guide_generator.py
├── monitoring/             # Unclaimed property monitoring
│   ├── chrome-pilot/       # Browser scrapers (23 states)
│   ├── monitor.js          # Orchestrator
│   ├── match_detector.js   # Scoring logic
│   ├── schema.sql          # Database schema
│   └── monitor-workflow.yml
└── README.md
```

## Environment Variables
- `GEMINI_API_KEY` — Google Gemini API key
- `STRIPE_SECRET_KEY` — Stripe secret key
- `DATABASE_URL` — Database connection string