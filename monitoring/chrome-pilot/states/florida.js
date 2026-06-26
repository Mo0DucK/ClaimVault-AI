// Florida — Department of Financial Services — Unclaimed Property
// https://fltreasurehunt.gov/ClaimSearch
//
// React SPA — wait for form render, fill, submit, parse results

const URL = 'https://fltreasurehunt.gov/ClaimSearch';

async function search(page, { lastName, firstName, city, zip }) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Wait for the React form to render
  await page.waitForSelector('input[name="LastName"], #LastName, input[placeholder*="Last Name" i]', { timeout: 15000 });

  await page.fill('input[name="LastName"], #LastName, input[placeholder*="Last Name" i]', lastName);
  if (firstName) {
    await page.fill('input[name="FirstName"], #FirstName, input[placeholder*="First Name" i]', firstName);
  }
  if (city) {
    await page.fill('input[name="City"], #City, input[placeholder*="City" i]', city).catch(() => {});
  }
  if (zip) {
    await page.fill('input[name="ZipCode"], #ZipCode, input[placeholder*="Zip" i]', zip).catch(() => {});
  }

  await page.click('button[type="submit"], input[type="submit"], button:has-text("Search")');
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  const allResults = [];
  let hasNext = true;

  while (hasNext) {
    const rows = await parseResultTable(page);
    allResults.push(...rows);

    const nextBtn = await page.$('a:has-text("Next"):not(.disabled), button:has-text("Next"):not(:disabled), [aria-label="Next"]');
    if (nextBtn) {
      await nextBtn.click();
      await page.waitForLoadState('networkidle', { timeout: 15000 });
    } else {
      hasNext = false;
    }
  }

  return allResults;
}

async function parseResultTable(page) {
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

      const claimLink = tr.querySelector('a[href*="claim"], button:has-text("Claim")');
      const amountStr = col(['amount', 'value', 'cash']);

      rows.push({
        state: 'FL',
        propertyId: col(['property id', 'prop id', 'account']),
        ownerName: col(['owner name', 'owner', 'name']),
        address: col(['address', 'street']),
        city: col(['city']),
        zip: col(['zip', 'postal']),
        holderName: col(['holder', 'reported by', 'reporting']),
        propertyType: col(['property type', 'type', 'category']),
        amount: amountStr,
        amountCents: parseAmount(amountStr),
        yearReported: parseInt(col(['year', 'reported', 'date'])) || 0,
        claimUrl: claimLink ? claimLink.href || null : null,
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
