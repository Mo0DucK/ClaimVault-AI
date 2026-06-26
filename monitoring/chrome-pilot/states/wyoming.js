// Wyoming — Unclaimed Property Search
// https://wyoming.findyourunclaimedproperty.com/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://wyoming.findyourunclaimedproperty.com/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'WY', url: URL });
}

module.exports = { search };
