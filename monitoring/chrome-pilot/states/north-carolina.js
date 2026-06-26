// North Carolina — NCCash — Unclaimed Property
// https://unclaimed.nccash.gov/app/claim-search
// Vendor platform (Angular SPA + Cloudflare Turnstile) — requires CDP

const vendor = require('./vendor-platform');

const URL = 'https://unclaimed.nccash.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'NC', url: URL });
}

module.exports = { search };
