/**
 * ClaimVault AI Monitoring Orchestrator
 * 
 * This script:
 * 1. Loads subscriber profiles from the database.
 * 2. Runs scrapers for each profile.
 * 3. Detects matches and scores them.
 * 4. Saves new matches to the database.
 * 5. Marks matches for notification.
 */

const { createClient } = require('@supabase/supabase-js');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const detector = require('./match_detector');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function runSearch(profile) {
    return new Promise((resolve, reject) => {
        const states = profile.states ? profile.states.join(',') : '';
        const args = [
            'unclaimed-search.js',
            '--last', profile.last_name,
            '--first', profile.first_name || '',
            '--city', profile.city || '',
            '--zip', profile.zip || '',
            '--states', states,
            '--cdp' // Required for most states
        ];

        console.log(`Running search for: ${profile.first_name} ${profile.last_name} in ${states || 'all states'}`);

        const child = spawn('node', args, {
            cwd: path.join(__dirname, 'chrome-pilot'),
            env: { ...process.env, PATH: process.env.PATH }
        });

        let stdout = '';
        let stderr = '';

        child.stdout.on('data', (data) => { stdout += data; });
        child.stderr.on('data', (data) => { stderr += data; });

        child.on('close', (code) => {
            if (code !== 0) {
                console.error(`Scraper exited with code ${code}`);
                console.error(stderr);
                return resolve(null);
            }
            try {
                const results = JSON.parse(stdout);
                resolve(results);
            } catch (err) {
                console.error('Failed to parse scraper output');
                resolve(null);
            }
        });
    });
}

async function main() {
    console.log('Starting monitoring run...');

    // 1. Fetch active profiles
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

    if (error) {
        console.error('Error fetching profiles:', error);
        return;
    }

    console.log(`Processing ${profiles.length} profiles`);

    let totalMatches = 0;

    for (const profile of profiles) {
        const output = await runSearch(profile);
        if (!output || !output.results) continue;

        for (const result of output.results) {
            // Re-score for verification
            const score = detector.scoreResult(result, {
                lastName: profile.last_name,
                firstName: profile.first_name,
                city: profile.city,
                zip: profile.zip
            });

            if (score < 50) continue; // Skip low confidence matches for auto-alerts

            const confidence = detector.getConfidenceLabel(score);

            // 2. Save match to DB
            const { data: savedMatch, error: matchError } = await supabase
                .from('matches')
                .upsert({
                    profile_id: profile.id,
                    state: result.state,
                    property_id: result.propertyId,
                    owner_name: result.ownerName,
                    address: result.address,
                    city: result.city,
                    zip: result.zip,
                    amount_cents: result.amountCents,
                    holder_name: result.holderName,
                    property_type: result.propertyType,
                    confidence: confidence,
                    match_score: score,
                    details: result
                }, {
                    onConflict: 'profile_id, state, property_id'
                })
                .select()
                .single();

            if (matchError) {
                if (matchError.code !== '23505') { 
                    console.error('Error saving match:', matchError);
                }
            } else if (savedMatch) {
                totalMatches++;
                
                // 3. Create notification if this is a high/medium confidence match and not already notified
                if ((score >= 50) && !savedMatch.notified_at) {
                    await supabase.from('notifications').insert({
                        subscriber_id: profile.subscriber_id,
                        match_id: savedMatch.id,
                        type: 'EMAIL',
                        status: 'PENDING',
                        content: {
                            subject: `ClaimVault AI Alert: Potential Unclaimed Asset in ${result.state}`,
                            body: `Hello, we found a potential unclaimed asset matching your family name ${profile.last_name} in ${result.state}. \n\nOwner: ${result.ownerName}\nAmount: ${result.amount || 'Not disclosed'}\n\nLog in to ClaimVault AI to generate your claim kit.`
                        }
                    });
                }
            }
        }
    }

    // 4. Log the run
    await supabase.from('monitoring_logs').insert({
        profiles_processed: profiles.length,
        matches_found: totalMatches
    });

    console.log(`Monitoring run complete. Found ${totalMatches} new/updated matches.`);
}

main().catch(console.error);
