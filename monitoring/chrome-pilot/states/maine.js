// Maine — Unclaimed Property Search
// https://www.maineunclaimedproperty.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://www.maineunclaimedproperty.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'ME', url: URL });
}

module.exports = { search };
