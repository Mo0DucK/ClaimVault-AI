/**
 * Match Detector Logic
 * 
 * Compares scraped unclaimed property results against a user profile.
 */

function scoreResult(result, query) {
    let score = 0;
  
    const rName = (result.ownerName || '').toUpperCase();
    const qLast = (query.lastName || '').toUpperCase();
    const qFirst = (query.firstName || '').toUpperCase();
  
    // Exact last name match is strong
    if (qLast && rName.includes(qLast)) {
        score += 50;
    } else {
        return 0; // If last name doesn't match at all, it's not a match
    }

    // First name match
    if (qFirst && rName.includes(qFirst)) {
        score += 30;
    } else if (qFirst && rName.includes(qFirst.slice(0, 3))) {
        score += 15; // Partial first name (e.g. "Jon" for "Jonathan")
    }
  
    // City match
    if (query.city && result.city && result.city.toUpperCase() === query.city.toUpperCase()) {
        score += 10;
    }
    
    // Zip match
    if (query.zip && result.zip && result.zip.startsWith(query.zip)) {
        score += 10;
    }
  
    // Non-zero amount is slightly better
    if (result.amountCents > 0) {
        score += 5;
    }
  
    return Math.min(score, 100);
}

function getConfidenceLabel(score) {
    if (score >= 80) return 'HIGH';
    if (score >= 50) return 'MEDIUM';
    return 'LOW';
}

module.exports = {
    scoreResult,
    getConfidenceLabel
};
