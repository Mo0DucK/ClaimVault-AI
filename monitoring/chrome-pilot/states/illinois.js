// Illinois — State Treasurer — I-Cash Unclaimed Property
// https://icash.illinoistreasurer.gov/app/claim-search
//
// Kelmar vendor platform — same as TX, CO, WA etc. NO Cloudflare Turnstile.
// Works headless.

const vendor = require('./vendor-platform');

const URL = 'https://icash.illinoistreasurer.gov/app/claim-search';

async function search(page, query) {
  return vendor.search(page, query, { state: 'IL', url: URL });
}

module.exports = { search };
