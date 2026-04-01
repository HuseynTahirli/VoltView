require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ SUPABASE_URL or SUPABASE_KEY missing in .env file!");
}

const activeKey = (supabaseServiceKey && supabaseServiceKey.trim())
    ? supabaseServiceKey.trim()
    : supabaseKey;

if (activeKey === supabaseKey) {
    console.warn("⚠️  SUPABASE_SERVICE_KEY not set — using anon key. RLS policies will apply and may block reads/writes on protected tables.");
} else {
    console.log("✅ Using Supabase service role key (RLS bypassed).");
}

const supabase = createClient(supabaseUrl, activeKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

module.exports = supabase;
