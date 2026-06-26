// California State Controller — Unclaimed Property
// https://claimit.ca.gov
//
// Kelmar jumbotron homepage portal. No CAPTCHA — works headless.

const kelmar = require('./kelmar-jumbotron');

const URL = 'https://claimit.ca.gov';

async function search(page, query) {
  return kelmar.search(page, query, { state: 'CA', url: URL });
}

module.exports = { search };
