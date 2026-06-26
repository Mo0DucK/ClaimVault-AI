// Playwright CDP connection - connects to your real Chrome profile.
//
// CLI usage:
//   node browse.js <url> [--screenshot out.png] [--har out.har]
//
// Module usage:
//   const { connect } = require('./browse');
//   const { browser, context, page } = await connect();
//
// Requires Chrome running with --remote-debugging-port=9222
// Start it with: ./launch-chrome.sh

const { chromium } = require('playwright');
const { harFromMessages } = require('chrome-har');

const PORT = process.env.CDP_PORT || 9222;

const HAR_EVENTS = [
  'Page.loadEventFired',
  'Page.domContentEventFired',
  'Page.frameStartedLoading',
  'Page.frameAttached',
  'Network.requestWillBeSent',
  'Network.requestServedFromCache',
  'Network.dataReceived',
  'Network.responseReceived',
  'Network.resourceChangedPriority',
  'Network.loadingFinished',
  'Network.loadingFailed',
];

async function connect(opts = {}) {
  const browser = await chromium.connectOverCDP(`http://localhost:${PORT}`);
  const context = browser.contexts()[0];
  const pages = context.pages();
  const page = pages.length > 0 ? pages[0] : await context.newPage();
  return { browser, context, page };
}

function parseArgs(argv) {
  const args = { url: null, screenshot: null, har: null };
  const rest = argv.slice(2);
  for (let i = 0; i < rest.length; i++) {
    if (rest[i] === '--screenshot' && rest[i + 1]) {
      args.screenshot = rest[++i];
    } else if (rest[i] === '--har' && rest[i + 1]) {
      args.har = rest[++i];
    } else if (!rest[i].startsWith('-')) {
      args.url = rest[i];
    }
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv);
  const { browser, context, page } = await connect();

  if (args.har && args.url) {
    // HAR capture: use a fresh tab with CDP listeners attached before navigation
    const harPage = await context.newPage();
    const cdp = await context.newCDPSession(harPage);
    const harEvents = [];

    await cdp.send('Network.enable');
    await cdp.send('Page.enable');

    for (const method of HAR_EVENTS) {
      cdp.on(method, (params) => {
        harEvents.push({ method, params });
      });
    }

    cdp.on('Network.loadingFinished', async ({ requestId }) => {
      try {
        const { body, base64Encoded } = await cdp.send('Network.getResponseBody', { requestId });
        const entry = harEvents.find(
          e => e.method === 'Network.responseReceived' && e.params.requestId === requestId
        );
        if (entry) {
          entry.params.response._body = body;
          entry.params.response._base64Encoded = base64Encoded;
        }
      } catch (_) {}
    });

    await harPage.goto(args.url, { waitUntil: 'networkidle' });
    console.log(`Navigated to: ${harPage.url()}`);
    console.log(`Title: ${await harPage.title()}`);

    if (args.screenshot) {
      await harPage.screenshot({ path: args.screenshot, fullPage: true });
      console.log(`Screenshot saved: ${args.screenshot}`);
    }

    // Wait a beat for any trailing response bodies
    await new Promise(r => setTimeout(r, 1000));

    const fs = require('fs');
    const har = harFromMessages(harEvents, { includeTextFromResponseBody: true });
    fs.writeFileSync(args.har, JSON.stringify(har, null, 2));
    console.log(`HAR saved: ${args.har} (${har.log.entries.length} entries)`);

    await harPage.close();
  } else {
    if (args.url) {
      await page.goto(args.url, { waitUntil: 'networkidle' });
      console.log(`Navigated to: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);
    } else {
      console.log(`Current page: ${page.url()}`);
      console.log(`Title: ${await page.title()}`);
    }

    if (args.screenshot) {
      await page.screenshot({ path: args.screenshot, fullPage: true });
      console.log(`Screenshot saved: ${args.screenshot}`);
    }
  }

  await browser.close();
}

// Only run main() when executed directly, not when required as a module
if (require.main === module) {
  main().catch(err => {
    console.error(err.message);
    process.exit(1);
  });
}

module.exports = { connect };
