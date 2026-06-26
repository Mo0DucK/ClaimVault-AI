// Pennsylvania Treasury — Unclaimed Property Search
// https://unclaimedproperty.patreasury.gov/
//
// Standard vendor-like portal.

const SEARCH_URL = 'https://unclaimedproperty.patreasury.gov/en/Property/SearchIndex';

async function search(page, { lastName, firstName, city, zip }) {
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the form
  await page.waitForSelector('input[name="lastName"]', { timeout: 15000 });

  // Fill the form
  await page.fill('input[name="lastName"]', lastName);
  if (firstName) {
    await page.fill('input[name="firstName"]', firstName);
  }
  if (city) {
    await page.fill('input[name="city"]', city);
  }

  // Submit
  await page.click('button:has-text("Search")');

  // Wait for results
  try {
    await page.waitForSelector('table, .search-results, .no-results', { timeout: 20000 });
  } catch (err) {
    // If it fails, maybe it's reCAPTCHA or something else
  }

  return await parseResults(page);
}

async function parseResults(page) {
  return page.evaluate(() => {
    const rows = [];
    const table = document.querySelector('table');
    if (!table) return rows;

    const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th'))
      .map(th => th.textContent.trim().toLowerCase());

    const bodyRows = table.querySelectorAll('tbody tr');
    for (const tr of bodyRows) {
      const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
      if (cells.length === 0) continue;

      const col = (keywords) => {
        const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
        return idx >= 0 ? cells[idx] || '' : '';
      };

      const amountStr = col(['amount', 'value']);
      rows.push({
        state: 'PA',
        propertyId: col(['property id', 'prop id']),
        ownerName: col(['owner name', 'owner']),
        address: col(['address', 'street']),
        city: col(['city']),
        zip: col(['zip', 'postal']),
        holderName: col(['holder', 'reported by']),
        propertyType: col(['property type', 'type']),
        amount: amountStr,
        amountCents: parseAmount(amountStr),
        yearReported: parseInt(col(['year', 'reported'])) || 0,
        claimUrl: null,
      });
    }

    return rows;

    function parseAmount(s) {
      if (!s || s.toLowerCase().includes('not disclosed')) return 0;
      const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 100);
    }
  });
}

module.exports = { search };
