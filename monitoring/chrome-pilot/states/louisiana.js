// Louisiana — Unclaimed Property Search
// https://unclaimedproperty.la.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://unclaimedproperty.la.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'LA', url: URL });
}

module.exports = { search };
