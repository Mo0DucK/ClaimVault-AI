// Oregon State Treasury — Unclaimed Property
// https://unclaimed.oregon.gov
//
// Kelmar jumbotron homepage portal. No CAPTCHA — works headless.

const kelmar = require('./kelmar-jumbotron');

const URL = 'https://unclaimed.oregon.gov';

async function search(page, query) {
  return kelmar.search(page, query, { state: 'OR', url: URL });
}

module.exports = { search };
