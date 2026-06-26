// New Jersey — Unclaimed Funds
// https://unclaimedfunds.nj.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://unclaimedfunds.nj.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'NJ', url: URL });
}

module.exports = { search };
