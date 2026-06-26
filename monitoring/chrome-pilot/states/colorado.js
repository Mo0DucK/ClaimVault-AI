// Colorado — Unclaimed Property Search
// https://unclaimedproperty.colorado.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://unclaimedproperty.colorado.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'CO', url: URL });
}

module.exports = { search };
