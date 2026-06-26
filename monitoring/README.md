# ClaimVault AI Monitoring System

Automated weekly search for unclaimed property across US states.

## Components

- `chrome-pilot/`: Browser-based scraping engine using Playwright + CDP.
  - Supports 20+ states including those with Cloudflare Turnstile.
  - Custom scrapers for CA, FL, NY, TX, PA, IL, OH, GA, NC, MI (Top 10).
- `monitor.js`: Orchestrator that:
  - Fetches monitoring profiles from Supabase.
  - Runs parallel searches.
  - Detects matches and scores confidence.
  - Saves matches and queues notifications.
- `match_detector.js`: Scoring logic based on name, city, and zip matches.
- `schema.sql`: Database schema for subscribers, profiles, matches, and notifications.
- `monitor-workflow.yml`: GitHub Actions configuration for weekly runs.

## Setup

1.  **Database:** Apply `schema.sql` to your Supabase instance.
2.  **Environment Variables:** Create a `.env` file with:
    - `SUPABASE_URL`
    - `SUPABASE_SERVICE_ROLE_KEY`
3.  **Dependencies:**
    ```bash
    npm install
    cd chrome-pilot && npm install
    npx playwright install chromium
    ```

## Usage

Run the monitor manually:
```bash
node monitor.js
```

The system is designed to run weekly via GitHub Actions.

## Match Confidence Scoring

Matches are scored from 0-100:
- **Last Name Match:** 50 points
- **First Name Match:** 30 points (15 for partial)
- **City Match:** 10 points
- **Zip Match:** 10 points
- **Amount > 0:** 5 points

Confidence labels:
- **HIGH:** 80+
- **MEDIUM:** 50-79
- **LOW:** < 50
