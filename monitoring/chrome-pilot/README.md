# chrome-pilot

Agentic control of a real Chrome instance via CDP. Gives AI agents (or scripts) access to a fully authenticated browser with real cookies, sessions, and logins intact.

## Why

Headless browsers and bot frameworks get detected. Programmatic Chrome with a fresh profile has no sessions. This gives you the best of both: a real Chrome with your real profile, controllable via CDP and Playwright.

Useful for:
- **AI agents** that need to browse authenticated sites
- **Reverse engineering** APIs by capturing network traffic from a real session
- **Automating workflows** on sites with no API

## Setup

```bash
pnpm install
chmod +x launch-chrome.sh
```

## Usage

### 1. Launch Chrome with CDP enabled

```bash
./launch-chrome.sh        # default port 9222
./launch-chrome.sh 9333   # custom port
```

This copies your real Chrome profile (cookies, logins, extensions) into a debug directory and launches Chrome with remote debugging enabled.

### 2. Browse, screenshot, and capture traffic

```bash
# Navigate and print title
node browse.js https://example.com

# Take a screenshot
node browse.js https://example.com --screenshot page.png

# Capture network traffic
node browse.js https://example.com --har traffic.json

# All at once
node browse.js https://example.com --screenshot page.png --har traffic.json
```

### 3. Use as a module

```js
const { connect } = require('./browse');

const { browser, context, page } = await connect();

// Full Playwright API on a real, authenticated Chrome
await page.goto('https://example.com');
await page.click('button#login');
const text = await page.textContent('.result');
await page.screenshot({ path: 'out.png' });

await browser.close();
```

## Environment variables

- `CDP_PORT` - Chrome debug port (default: `9222`)

## How it works

Chrome requires a non-default `--user-data-dir` for `--remote-debugging-port`. The launch script uses `rsync` to copy your real Chrome profile into `/tmp/chrome-debug-profile`, preserving all authentication state. On subsequent runs, it only syncs cookies and login data for speed.

Playwright connects via `chromium.connectOverCDP()`, giving you the full Playwright API on top of a real, authenticated Chrome instance. Traffic capture uses CDP sessions under the hood, so it works on the existing authenticated context (no separate incognito window).

## Platform

macOS only (Chrome path is hardcoded to `/Applications/Google Chrome.app`). PRs welcome for Linux/Windows support.
