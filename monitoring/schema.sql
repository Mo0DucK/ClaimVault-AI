-- ClaimVault AI Monitoring Schema

-- Subscribers table (managed by the full-stack app)
CREATE TABLE IF NOT EXISTS subscribers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Profiles table (each subscriber can have multiple family members to monitor)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT NOT NULL,
    city TEXT,
    zip TEXT,
    states TEXT[], -- Array of state codes (e.g., ['CA', 'TX'])
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Match History (records of matches found during monitoring)
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    state TEXT NOT NULL,
    property_id TEXT,
    owner_name TEXT,
    address TEXT,
    city TEXT,
    zip TEXT,
    amount_cents INTEGER,
    holder_name TEXT,
    property_type TEXT,
    confidence TEXT, -- 'HIGH', 'MEDIUM', 'LOW'
    match_score INTEGER,
    details JSONB, -- Full data from the scraper
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notified_at TIMESTAMP WITH TIME ZONE, -- When the user was alerted
    UNIQUE(profile_id, state, property_id)
);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscriber_id UUID REFERENCES subscribers(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'EMAIL', 'WEB', etc.
    status TEXT DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'FAILED'
    content JSONB, -- Email body, template params, etc.
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    sent_at TIMESTAMP WITH TIME ZONE
);

-- Monitoring Logs
CREATE TABLE IF NOT EXISTS monitoring_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    profiles_processed INTEGER,
    matches_found INTEGER,
    errors JSONB
);
