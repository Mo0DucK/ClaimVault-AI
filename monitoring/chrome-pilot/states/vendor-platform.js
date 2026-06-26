// Shared scraper for the /app/claim-search vendor platform
// Used by: TX, CO, WA, ID, LA, WY, ME, NC, NJ, TN
//
// All these states use the same Angular SPA with identical form structure:
//   #lastName, #firstName (optional), #city (optional), #searchZipCode (optional)
//   Submit via button[type="submit"] or #btn-turnstile
//   Results in .search-results-table or card-based layout
//
// CAPTCHA: These portals use Cloudflare Turnstile — requires CDP (real Chrome profile)
//          to pass. Will not work in headless mode.

async function search(page, { lastName, firstName, city, zip }, { state, url }) {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });

  // Wait for the Angular form to render
  await page.waitForSelector('#lastName', { timeout: 15000 });

  // Fill the search form
  await page.fill('#lastName', lastName);
  if (firstName) {
    const firstNameField = await page.$('#firstName');
    if (firstNameField) await page.fill('#firstName', firstName);
  }
  if (city) {
    const cityField = await page.$('#city');
    if (cityField) await page.fill('#city', city);
  }
  if (zip) {
    const zipField = await page.$('#searchZipCode');
    if (zipField) await page.fill('#searchZipCode', zip);
  }

  // Submit — click via JS to bypass Playwright visibility checks
  // (HOME button is also type=submit, so we target by class or text)
  const clicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[type="submit"]'));
    const searchBtn = buttons.find(b =>
      b.classList.contains('btn-action') ||
      b.textContent.trim().toUpperCase().includes('SEARCH')
    );
    if (searchBtn) {
      searchBtn.scrollIntoView();
      searchBtn.click();
      return true;
    }
    return false;
  });
  if (!clicked) {
    throw new Error(`[${state}] No search/submit button found`);
  }

  // Wait for results to appear (the platform renders results into the same page)
  // Look for result cards, result table, or "no results" message
  try {
    await page.waitForSelector(
      '.property-card, .search-results table, .search-results-container, .no-results-message, [class*="result"]',
      { timeout: 30000 }
    );
  } catch {
    // If no specific result container, wait a fixed time for Angular to render
    await page.waitForTimeout(5000);
  }

  // Small delay for Angular change detection
  await page.waitForTimeout(1000);

  // Collect all results across pages
  const allResults = [];
  let hasNext = true;

  while (hasNext) {
    const rows = await parseResults(page, state);
    allResults.push(...rows);

    // Check for pagination — Next button (use JS click to avoid visibility issues)
    const hasNextPage = await page.evaluate(() => {
      const nextLink = document.querySelector(
        'a.page-link:not(.disabled), li.page-item:not(.disabled) a'
      );
      if (nextLink && nextLink.textContent.trim().toLowerCase().includes('next')) {
        nextLink.click();
        return true;
      }
      // Also check for a Next button
      const nextBtn = Array.from(document.querySelectorAll('button, a')).find(el =>
        el.textContent.trim().toLowerCase() === 'next' &&
        !el.classList.contains('disabled') &&
        !el.closest('.disabled')
      );
      if (nextBtn) {
        nextBtn.click();
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

    // Strategy 1: Card-based results (most vendor platform implementations)
    const cards = document.querySelectorAll('.property-card, [class*="claim-search-result"], .card.result');
    if (cards.length > 0) {
      for (const card of cards) {
        const text = (sel) => {
          const el = card.querySelector(sel);
          return el ? el.textContent.trim() : '';
        };
        const allText = card.textContent;

        // Extract fields from card structure
        const ownerName = text('.owner-name, [class*="owner"], .card-title, h5, h4') ||
          extractField(allText, 'owner');
        const address = text('.address, [class*="address"]') ||
          extractField(allText, 'address');
        const holderName = text('.holder-name, [class*="holder"], [class*="reported"]') ||
          extractField(allText, 'holder');
        const propertyType = text('.property-type, [class*="type"]') ||
          extractField(allText, 'property type');
        const amountStr = text('.amount, [class*="amount"], [class*="value"]') ||
          extractField(allText, 'amount');
        const propertyId = text('.property-id, [class*="property-id"]') ||
          extractField(allText, 'property id');

        if (!ownerName) continue;

        rows.push({
          state: stateCode,
          propertyId: propertyId,
          ownerName: ownerName,
          address: address,
          city: extractCity(address),
          zip: extractZip(address),
          holderName: holderName,
          propertyType: propertyType,
          amount: amountStr,
          amountCents: parseAmount(amountStr),
          yearReported: extractYear(allText),
          claimUrl: null,
        });
      }
      return rows;
    }

    // Strategy 2: Table-based results
    const table = document.querySelector('.search-results table, table.table, table[class*="result"]');
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
        const ownerName = col(['owner name', 'owner', 'name']);
        if (!ownerName) continue;

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
      return rows;
    }

    // Strategy 3: Generic — find all result-like containers
    const containers = document.querySelectorAll('[class*="result-item"], [class*="search-result"], .list-group-item');
    for (const el of containers) {
      const text = el.textContent.trim();
      if (text.length < 10) continue;
      const ownerName = extractField(text, 'owner') || text.split('\n')[0].trim().substring(0, 100);
      if (!ownerName || ownerName.toLowerCase().includes('no properties')) continue;

      rows.push({
        state: stateCode,
        propertyId: '',
        ownerName: ownerName,
        address: extractField(text, 'address') || '',
        city: '',
        zip: '',
        holderName: extractField(text, 'holder') || extractField(text, 'reported') || '',
        propertyType: extractField(text, 'type') || '',
        amount: extractField(text, 'amount') || extractField(text, 'value') || '',
        amountCents: parseAmount(extractField(text, 'amount') || ''),
        yearReported: extractYear(text),
        claimUrl: null,
      });
    }

    return rows;

    // --- Helper functions ---
    function extractField(text, keyword) {
      const regex = new RegExp(keyword + '[:\\s]+([^\\n]+)', 'i');
      const match = text.match(regex);
      return match ? match[1].trim() : '';
    }

    function extractCity(addr) {
      if (!addr) return '';
      const parts = addr.split(',');
      return parts.length >= 2 ? parts[parts.length - 2].trim() : '';
    }

    function extractZip(addr) {
      if (!addr) return '';
      const match = addr.match(/\b(\d{5}(?:-\d{4})?)\b/);
      return match ? match[1] : '';
    }

    function parseAmount(s) {
      if (!s) return 0;
      if (s.toLowerCase().includes('not disclosed') || s.toLowerCase().includes('n/a')) return 0;
      // Handle ranges like "$50-100"
      const rangeMatch = s.match(/\$?([\d,.]+)\s*[-–]\s*\$?([\d,.]+)/);
      if (rangeMatch) {
        const low = parseFloat(rangeMatch[1].replace(/,/g, ''));
        const high = parseFloat(rangeMatch[2].replace(/,/g, ''));
        return Math.round(((low + high) / 2) * 100);
      }
      const num = parseFloat(s.replace(/[^0-9.\-]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 100);
    }

    function extractYear(text) {
      const match = text.match(/\b(20\d{2}|19\d{2})\b/);
      return match ? parseInt(match[1]) : 0;
    }
  }, state);
}

module.exports = { search };
