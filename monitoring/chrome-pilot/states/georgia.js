// Georgia Department of Revenue — Unclaimed Property
// https://dor.georgia.gov/unclaimed-property-program
//
// Custom search form. reCAPTCHA present — requires CDP mode.

const SEARCH_URL = 'https://ga.unclaimedproperty.com/en/Property/SearchIndex';

async function search(page, { lastName, firstName, city, zip }) {
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the form
  await page.waitForSelector('input[name="lastName"]', { timeout: 15000 });

  // Accept certification checkbox
  await page.check('input[type="checkbox"][name="certify"]');

  // Fill the form
  await page.fill('input[name="lastName"]', lastName);
  if (firstName) {
    await page.fill('input[name="firstName"]', firstName);
  }
  if (city) {
    await page.fill('input[name="city"]', city);
  }

  // reCAPTCHA bypass logic (if using CDP and manual solve or auto-solve)
  // For now, we assume CDP allows it or we wait for it.
  
  // Submit
  await page.click('button:has-text("Search Properties")');

  // Wait for results
  try {
    await page.waitForSelector('table, .search-results, .no-results', { timeout: 20000 });
  } catch (err) {
    // Check if reCAPTCHA is blocking
    const captchaVisible = await page.isVisible('.g-recaptcha, iframe[src*="recaptcha"]');
    if (captchaVisible) {
      throw new Error('[GA] reCAPTCHA blocked the search — requires manual solve or CDP solver');
    }
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
        state: 'GA',
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
