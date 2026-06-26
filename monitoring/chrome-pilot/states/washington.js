// Washington — Unclaimed Property Search
// https://ucp.dor.wa.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://ucp.dor.wa.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'WA', url: URL });
}

module.exports = { search };
