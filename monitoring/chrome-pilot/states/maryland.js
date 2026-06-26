// Maryland — Comptroller of Maryland — Unclaimed Property
// https://claimitmd.gov
//
// Kelmar jumbotron homepage portal. No CAPTCHA — works headless.

const kelmar = require('./kelmar-jumbotron');

const URL = 'https://claimitmd.gov';

async function search(page, query) {
  return kelmar.search(page, query, { state: 'MD', url: URL });
}

module.exports = { search };
