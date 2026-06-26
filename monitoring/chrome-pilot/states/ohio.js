// Ohio Division of Unclaimed Funds
// https://unclaimedfunds.ohio.gov/
//
// Fields: Last Name/Business Name (required), First Name, City, Zip Code, Property ID
// Results: Owner Name, Co-Owner, Reporting Business, Address, City, State, ZIP,
//          Amount, Property ID — with +CLAIM and SHARE buttons

const URL = 'https://unclaimedfunds.ohio.gov/';

async function search(page, { lastName, firstName, city, zip }) {
  await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });

  // Fill the search form
  await page.fill('input[name="LastName"], #LastName, input[placeholder*="Last Name" i], input[name="lastName"]', lastName);
  if (firstName) {
    await page.fill('input[name="FirstName"], #FirstName, input[placeholder*="First Name" i], input[name="firstName"]', firstName);
  }
  if (city) {
    await page.fill('input[name="City"], #City, input[placeholder*="City" i], input[name="city"]', city);
  }
  if (zip) {
    await page.fill('input[name="ZipCode"], #ZipCode, input[placeholder*="Zip" i], input[name="zipCode"]', zip);
  }

  // Submit
  await page.click('button[type="submit"], input[type="submit"], button:has-text("Search")');
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Collect results across pages
  const allResults = [];
  let hasNext = true;

  while (hasNext) {
    const rows = await parseResultTable(page);
    allResults.push(...rows);

    const nextBtn = await page.$('a:has-text("Next"):not(.disabled), button:has-text("Next"):not(:disabled), [aria-label="Next page"]');
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
    // Ohio may use cards or a table — try both
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

        const claimLink = tr.querySelector('a[href*="claim"], button:has-text("CLAIM")');
        const amountStr = col(['amount', 'value']);

        rows.push({
          state: 'OH',
          propertyId: col(['property id', 'prop id', 'claim id']),
          ownerName: col(['owner name', 'owner']),
          address: col(['address', 'street']),
          city: col(['city']),
          zip: col(['zip', 'postal']),
          holderName: col(['reporting', 'holder', 'business']),
          propertyType: col(['property type', 'type']),
          amount: amountStr,
          amountCents: parseAmount(amountStr),
          yearReported: parseInt(col(['year', 'reported'])) || 0,
          claimUrl: claimLink ? claimLink.href || null : null,
        });
      }
    } else {
      // Card-based layout fallback
      const cards = document.querySelectorAll('[class*="result"], [class*="card"], [class*="claim"]');
      for (const card of cards) {
        const text = card.textContent;
        const claimLink = card.querySelector('a[href*="claim"]');
        rows.push({
          state: 'OH',
          propertyId: extractField(text, /property\s*id[:\s]*([^\n,]+)/i),
          ownerName: extractField(text, /owner[:\s]*([^\n,]+)/i),
          address: '',
          city: '',
          zip: '',
          holderName: extractField(text, /report(?:ing|ed)\s*(?:by|business)[:\s]*([^\n,]+)/i),
          propertyType: extractField(text, /type[:\s]*([^\n,]+)/i),
          amount: extractField(text, /\$[\d,]+\.?\d*/),
          amountCents: parseAmount(extractField(text, /\$[\d,]+\.?\d*/)),
          yearReported: parseInt(extractField(text, /year[:\s]*(\d{4})/i)) || 0,
          claimUrl: claimLink ? claimLink.href : null,
        });
      }
    }

    return rows;

    function parseAmount(s) {
      if (!s || s.toLowerCase().includes('not disclosed')) return 0;
      const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 100);
    }

    function extractField(text, regex) {
      const m = text.match(regex);
      return m ? (m[1] || m[0]).trim() : '';
    }
  });
}

module.exports = { search };
