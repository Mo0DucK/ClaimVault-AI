// Idaho — Unclaimed Property Search
// https://yourmoney.idaho.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://yourmoney.idaho.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'ID', url: URL });
}

module.exports = { search };
