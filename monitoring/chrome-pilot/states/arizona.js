// Arizona Department of Revenue — Unclaimed Property Search
// https://azdor.gov/unclaimed-property/owners-file-claim/search-for-property
//
// AZ's search form posts to missingmoney.com which has bot detection.
// Requires CDP (real Chrome profile) to pass.

const SEARCH_URL = 'https://azdor.gov/unclaimed-property/owners-file-claim/search-for-property';

async function search(page, { lastName, firstName, city, zip }) {
  await page.goto(SEARCH_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the embedded search form
  await page.waitForSelector('input[name="SearchLastName"]', { timeout: 15000 });

  // Fill the form
  await page.fill('input[name="SearchLastName"]', lastName);
  if (firstName) {
    await page.fill('input[name="SearchFirstName"]', firstName);
  }

  // Submit — this posts to missingmoney.com/SWS/properties/redirect
  await page.click('input[name="GO"]');

  // Wait for missingmoney.com results page to load
  try {
    await page.waitForURL('**/missingmoney.com/**', { timeout: 15000 });
  } catch {
    // May not redirect if bot detection triggers
  }
  await page.waitForTimeout(3000);

  // Check for bot detection
  const botBlocked = await page.evaluate(() => {
    const text = document.body.textContent || '';
    return text.includes('bot_detected') || text.includes('Bot detection');
  });
  if (botBlocked) {
    throw new Error('Bot detection triggered on missingmoney.com — requires CDP mode');
  }

  // Parse results from missingmoney.com
  const allResults = [];
  let hasNext = true;

  while (hasNext) {
    const rows = await parseResults(page);
    allResults.push(...rows);

    const nextBtn = await page.$(
      'a:has-text("Next"):not(.disabled), ' +
      'button:has-text("Next"):not(:disabled), ' +
      '.pagination a[rel="next"]'
    );
    if (nextBtn && allResults.length < 5) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
    } else {
      hasNext = false;
    }
  }

  return allResults.slice(0, 5);
}

async function parseResults(page) {
  return page.evaluate(() => {
    const rows = [];

    // missingmoney.com uses table or card-based results
    const table = document.querySelector('table');
    if (table) {
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
          state: 'AZ',
          propertyId: col(['property id', 'prop id']),
          ownerName: col(['owner name', 'owner', 'name']),
          address: col(['address', 'street']),
          city: col(['city']),
          zip: col(['zip', 'postal']),
          holderName: col(['holder', 'reported by', 'company']),
          propertyType: col(['property type', 'type', 'category']),
          amount: amountStr,
          amountCents: parseAmount(amountStr),
          yearReported: parseInt(col(['year', 'reported'])) || 0,
          claimUrl: null,
        });
      }
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
