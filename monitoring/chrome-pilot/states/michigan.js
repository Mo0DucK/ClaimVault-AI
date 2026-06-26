// Michigan Department of Treasury — Unclaimed Property
// https://unclaimedproperty.michigan.gov/
//
// Kelmar jumbotron homepage portal. No CAPTCHA — works headless.

const kelmar = require('./kelmar-jumbotron');

const URL = 'https://unclaimedproperty.michigan.gov/';

async function search(page, query) {
  return kelmar.search(page, query, { state: 'MI', url: URL });
}

module.exports = { search };
