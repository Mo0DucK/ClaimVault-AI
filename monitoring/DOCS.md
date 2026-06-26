# Unclaimed Property Database Research

## MissingMoney.com
- **Type:** Aggregator for 40+ US states.
- **API Status:** No public/official API found.
- **Scraping Gotchas:** Uses bot detection (Akamai/Cloudflare).
- **Implementation:** Requires browser automation with CDP (Chrome DevTools Protocol) to bypass detection.

## State-Specific Portals
Many states use common vendor platforms:

### Kelmar (KPM) Platform
- **States:** CA, OR, MD
- **URL Pattern:** `https://claimit.ca.gov/`, `https://unclaimed.oregon.gov/`, `https://job.marylandtaxes.gov/`
- **Mechanism:** Often uses Cloudflare Turnstile.
- **Implementation:** Scraper `states/kelmar-jumbotron.js` handles these.

### Vendor Platform (Cloudflare Turnstile)
- **States:** TX, CO, WA, ID, LA, WY, ME, IL, NY, NC, NJ, TN
- **Mechanism:** Heavily protected by Cloudflare Turnstile.
- **Implementation:** Scraper `states/vendor-platform.js` handles these.

### Custom Portals
- **FL:** `https://www.fltreasurehunt.gov/`
- **OH:** `https://unclaimedfunds.ohio.gov/`
- **VA:** `https://www.vamoneysearch.gov/`
- **MO:** `https://www.showmemoney.com/`

## Public APIs
- **California:** No public JSON API, but `claimit.ca.gov` is searchable via POST.
- **Florida:** No official public API.
- **Texas:** No official public API.

**Conclusion:** Reliable automated monitoring requires browser-based scrapers (Playwright/Puppeteer) due to widespread use of Cloudflare Turnstile and other bot detection mechanisms.
