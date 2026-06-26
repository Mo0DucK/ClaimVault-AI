// Texas Comptroller — Unclaimed Property Search
// https://www.claimittexas.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://www.claimittexas.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'TX', url: URL });
}

module.exports = { search };
