// Shared scraper for Kelmar "jumbotron" homepage portals
// Used by: CA, OR, MD
//
// These portals have a hero search with:
//   input[name="lastName"] (placeholder: "Last or Business Name")
//   input[name="firstName"] (placeholder: "First Name (Optional)")
//   A "SEARCH" button inside the jumbotron
//
// No CAPTCHA — works headless.

async function search(page, { lastName, firstName, city, zip }, { state, url }) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the jumbotron search form
  await page.waitForSelector('input[name="lastName"]', { timeout: 15000 });

  // Fill the jumbotron form (use the first matching input — the jumbotron one)
  await page.evaluate(({ ln, fn }) => {
    const lastInputs = document.querySelectorAll('input[name="lastName"]');
    if (lastInputs.length > 0) {
      lastInputs[0].value = ln;
      lastInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
    }
    if (fn) {
      const firstInputs = document.querySelectorAll('input[name="firstName"]');
      if (firstInputs.length > 0) {
        firstInputs[0].value = fn;
        firstInputs[0].dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }, { ln: lastName, fn: firstName || '' });

  // Submit via JS click on the SEARCH button
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"]'));
    const searchBtn = buttons.find(b =>
      b.textContent.trim().toUpperCase().includes('SEARCH') ||
      (b.value && b.value.toUpperCase().includes('SEARCH'))
    );
    if (searchBtn) {
      searchBtn.click();
      return true;
    }
    return false;
  });
  if (!clicked) {
    throw new Error(`[${state}] No SEARCH button found`);
  }

  // Wait for results (navigates to /app/claim-search or renders inline)
  try {
    await page.waitForSelector(
      'table, .search-results, .no-results, [class*="result"]',
      { timeout: 30000 }
    );
  } catch {
    await page.waitForTimeout(5000);
  }

  await page.waitForTimeout(1000);

  // Collect results with pagination
  const allResults = [];
  let hasNext = true;

  while (hasNext) {
    const rows = await parseResults(page, state);
    allResults.push(...rows);

    // Pagination via JS click
    const hasNextPage = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll('a, button'));
      const nextLink = links.find(el =>
        el.textContent.trim().toLowerCase() === 'next' &&
        !el.classList.contains('disabled') &&
        !el.closest('.disabled')
      );
      if (nextLink) {
        nextLink.click();
        return true;
      }
      return false;
    });
    if (hasNextPage && allResults.length < 5) {
      await page.waitForTimeout(2000);
    } else {
      hasNext = false;
    }
  }

  return allResults.slice(0, 5);
}

async function parseResults(page, state) {
  return page.evaluate((stateCode) => {
    const rows = [];

    const table = document.querySelector('table.table, table[class*="result"], table');
    if (table) {
      const headers = Array.from(table.querySelectorAll('thead th, tr:first-child th'))
        .map(th => th.textContent.trim().toLowerCase());

      if (headers.length === 0) return rows;

      const bodyRows = table.querySelectorAll('tbody tr');
      for (const tr of bodyRows) {
        const cells = Array.from(tr.querySelectorAll('td')).map(td => td.textContent.trim());
        if (cells.length === 0) continue;

        const col = (keywords) => {
          const idx = headers.findIndex(h => keywords.some(k => h.includes(k)));
          return idx >= 0 ? cells[idx] || '' : '';
        };

        const ownerName = col(['owner name', 'owner', 'name']);
        if (!ownerName) continue;

        const amountStr = col(['amount', 'value']);

        rows.push({
          state: stateCode,
          propertyId: col(['property id', 'prop id', 'claim']),
          ownerName: ownerName,
          address: col(['address', 'street']),
          city: col(['city']),
          zip: col(['zip', 'postal']),
          holderName: col(['holder', 'reported by', 'reporting', 'company']),
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
      const rangeMatch = s.match(/\$?([\d,.]+)\s*[-–]\s*\$?([\d,.]+)/);
      if (rangeMatch) {
        const low = parseFloat(rangeMatch[1].replace(/,/g, ''));
        const high = parseFloat(rangeMatch[2].replace(/,/g, ''));
        return Math.round(((low + high) / 2) * 100);
      }
      const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 100);
    }
  }, state);
}

module.exports = { search };
