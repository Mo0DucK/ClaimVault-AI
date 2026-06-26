#!/usr/bin/env node
// Unclaimed Property Search — Orchestrator
//
// Searches state unclaimed property portals in parallel and returns unified JSON.
//
// Usage:
//   node unclaimed-search.js --last "Smith" --first "John" --states TX,CA,OR
//   node unclaimed-search.js --last "Smith" --states TX,CA --headless
//   node unclaimed-search.js --last "Smith" --first "John" --out results.json
//
// Modes:
//   Default:    Uses CDP for CAPTCHA states + headless for clean states (hybrid)
//   --headless: Forces headless for ALL states (CAPTCHA states will likely fail)
//   --cdp:      Forces CDP for ALL states (requires Chrome with --remote-debugging-port)
//
// Flags:
//   --states TX,CA,OR  Comma-separated list of states to search (default: all registered)
//   --headless         Force headless mode for all states
//   --cdp              Force CDP mode for all states
//   --out file.json    Write results to file instead of stdout

const fs = require('fs');
const { chromium } = require('playwright');
const { connect } = require('./browse');

// --- State registry ---

const STATE_MODULES = {
  TX: () => require('./states/texas'),
  IL: () => require('./states/illinois'),
  CO: () => require('./states/colorado'),
  WA: () => require('./states/washington'),
  CA: () => require('./states/california'),
  OR: () => require('./states/oregon'),
  AZ: () => require('./states/arizona'),
  ID: () => require('./states/idaho'),
  LA: () => require('./states/louisiana'),
  WY: () => require('./states/wyoming'),
  ME: () => require('./states/maine'),
  MD: () => require('./states/maryland'),
  // Additional states with scrapers (not in primary user set)
  OH: () => require('./states/ohio'),
  NY: () => require('./states/new-york'),
  FL: () => require('./states/florida'),
  NC: () => require('./states/north-carolina'),
  NJ: () => require('./states/new-jersey'),
  VA: () => require('./states/virginia'),
  MA: () => require('./states/massachusetts'),
  TN: () => require('./states/tennessee'),
  MO: () => require('./states/missouri'),
  MI: () => require('./states/michigan'),
  PA: () => require('./states/pennsylvania'),
  GA: () => require('./states/georgia'),
};

// States that require CDP (real Chrome profile) due to CAPTCHA / bot detection
// ALL supported states require CDP — every Kelmar portal has Cloudflare Turnstile
const CAPTCHA_STATES = new Set([
  'TX', 'IL', 'CO', 'WA', 'ID', 'LA', 'WY', 'ME',  // Vendor platform — Cloudflare Turnstile
  'CA', 'OR', 'MD',                                    // Kelmar jumbotron → redirects to /app/claim-search
  'AZ',                                                // missingmoney.com — bot detection
  'NY', 'NC', 'NJ', 'TN', 'GA', 'PA',                             // Vendor platform — Cloudflare Turnstile
]);

// --- CLI argument parsing ---

function parseArgs(argv) {
  const args = {
    lastName: null, firstName: null, city: null, zip: null,
    out: null, states: null, headless: false, cdp: false,
  };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    switch (rest[i]) {
      case '--last':     args.lastName  = rest[++i]; break;
      case '--first':    args.firstName = rest[++i]; break;
      case '--city':     args.city      = rest[++i]; break;
      case '--zip':      args.zip       = rest[++i]; break;
      case '--out':      args.out       = rest[++i]; break;
      case '--states':   args.states    = rest[++i]; break;
      case '--headless': args.headless  = true;      break;
      case '--cdp':      args.cdp       = true;      break;
    }
  }
  return args;
}

// --- Match confidence scoring ---

function scoreResult(result, query) {
  let score = 0;

  const rName = (result.ownerName || '').toUpperCase();
  const qLast = (query.lastName || '').toUpperCase();
  const qFirst = (query.firstName || '').toUpperCase();

  if (qLast && rName.includes(qLast)) score += 50;
  if (qFirst && rName.includes(qFirst)) score += 30;
  else if (qFirst && rName.includes(qFirst.slice(0, 3))) score += 15;

  if (query.city && (result.city || '').toUpperCase() === query.city.toUpperCase()) score += 10;
  if (query.zip && (result.zip || '').startsWith(query.zip)) score += 10;

  if (result.amountCents > 0) score += 5;

  return Math.min(score, 100);
}

function confidenceLabel(score) {
  if (score >= 80) return 'HIGH';
  if (score >= 50) return 'MEDIUM';
  return 'LOW';
}

// --- Browser management ---

async function launchHeadless() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  return { browser, context };
}

async function connectCDP() {
  return await connect();
}

// --- Main ---

async function main() {
  const args = parseArgs(process.argv);

  if (!args.lastName) {
    console.error('Usage: node unclaimed-search.js --last "Smith" [--first "John"] [--city "Austin"] [--zip "78701"] [--states TX,CA,OR] [--headless|--cdp] [--out results.json]');
    process.exit(1);
  }

  // Determine which states to search
  let stateCodes;
  if (args.states) {
    stateCodes = args.states.split(',').map(s => s.trim().toUpperCase()).filter(s => STATE_MODULES[s]);
    const unknown = args.states.split(',').map(s => s.trim().toUpperCase()).filter(s => !STATE_MODULES[s]);
    if (unknown.length > 0) {
      console.error(`Warning: Unknown state(s) skipped: ${unknown.join(', ')}`);
    }
  } else {
    stateCodes = Object.keys(STATE_MODULES);
  }

  if (stateCodes.length === 0) {
    console.error('Error: No valid states to search');
    process.exit(1);
  }

  const query = {
    lastName: args.lastName,
    firstName: args.firstName,
    city: args.city,
    zip: args.zip,
  };

  // Split states by browser mode needed
  const needsCDP = stateCodes.filter(s => CAPTCHA_STATES.has(s));
  const canHeadless = stateCodes.filter(s => !CAPTCHA_STATES.has(s));

  // Determine actual mode
  let mode;
  if (args.cdp) {
    mode = 'cdp';
  } else if (args.headless) {
    mode = 'headless';
  } else {
    mode = needsCDP.length > 0 ? 'hybrid' : 'headless';
  }

  console.error(`Searching unclaimed property for: ${query.firstName || ''} ${query.lastName}`.trim());
  console.error(`States: ${stateCodes.join(', ')} | Mode: ${mode}`);
  if (mode === 'hybrid') {
    console.error(`  CDP states: ${needsCDP.join(', ') || 'none'}`);
    console.error(`  Headless states: ${canHeadless.join(', ') || 'none'}`);
  }

  // Launch browser(s)
  let cdpBrowser = null, cdpContext = null;
  let headlessBrowser = null, headlessContext = null;
  const browsersToClose = [];

  try {
    if (mode === 'cdp') {
      const conn = await connectCDP();
      cdpBrowser = conn.browser;
      cdpContext = conn.context;
      browsersToClose.push(cdpBrowser);
    } else if (mode === 'headless') {
      const hl = await launchHeadless();
      headlessBrowser = hl.browser;
      headlessContext = hl.context;
      browsersToClose.push(headlessBrowser);
    } else {
      // Hybrid: launch both
      if (canHeadless.length > 0) {
        const hl = await launchHeadless();
        headlessBrowser = hl.browser;
        headlessContext = hl.context;
        browsersToClose.push(headlessBrowser);
      }
      if (needsCDP.length > 0) {
        try {
          const conn = await connectCDP();
          cdpBrowser = conn.browser;
          cdpContext = conn.context;
          browsersToClose.push(cdpBrowser);
        } catch (err) {
          console.error(`  Warning: CDP connection failed (${err.message}). CAPTCHA states will be skipped.`);
        }
      }
    }

    // Create search tasks
    const tasks = stateCodes.map(async (code) => {
      const needsCDPForState = CAPTCHA_STATES.has(code);
      let context;

      if (mode === 'cdp') {
        context = cdpContext;
      } else if (mode === 'headless') {
        context = headlessContext;
      } else {
        context = needsCDPForState ? cdpContext : headlessContext;
      }

      if (!context) {
        return { state: code, results: [], error: 'No browser available (CDP not connected)' };
      }

      const stateModule = STATE_MODULES[code]();
      const page = await context.newPage();
      await page.setViewportSize({ width: 1280, height: 900 });
      try {
        console.error(`  [${code}] Searching...${needsCDPForState ? ' (CDP)' : ''}`);
        const results = await stateModule.search(page, query);
        console.error(`  [${code}] Found ${results.length} result(s)`);
        return { state: code, results };
      } catch (err) {
        console.error(`  [${code}] Error: ${err.message}`);
        return { state: code, results: [], error: err.message };
      } finally {
        await page.close();
      }
    });

    const settled = await Promise.allSettled(tasks);

    // Flatten + score all results
    const output = { query, searched: [], results: [] };

    for (const result of settled) {
      const val = result.status === 'fulfilled'
        ? result.value
        : { state: '??', results: [], error: result.reason?.message };
      output.searched.push({
        state: val.state,
        count: val.results.length,
        error: val.error || null,
      });
      for (const r of val.results) {
        const score = scoreResult(r, query);
        output.results.push({ ...r, matchScore: score, matchConfidence: confidenceLabel(score) });
      }
    }

    // Keep top 5 results per state (highest score first)
    const byState = {};
    for (const r of output.results) {
      (byState[r.state] ??= []).push(r);
    }
    output.results = [];
    for (const state of Object.keys(byState)) {
      byState[state].sort((a, b) => b.matchScore - a.matchScore);
      output.results.push(...byState[state].slice(0, 5));
    }

    // Sort all by confidence descending
    output.results.sort((a, b) => b.matchScore - a.matchScore);

    const json = JSON.stringify(output, null, 2);

    if (args.out) {
      fs.writeFileSync(args.out, json);
      console.error(`Results written to ${args.out}`);
    } else {
      console.log(json);
    }
  } finally {
    for (const b of browsersToClose) {
      await b.close().catch(() => {});
    }
  }
}

main().catch(err => {
  console.error(err.message);
  process.exit(1);
});
