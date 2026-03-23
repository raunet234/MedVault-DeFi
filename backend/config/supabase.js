const { createClient } = require("@supabase/supabase-js");

let supabase = null;

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn("⚠️  SUPABASE_URL or SUPABASE_ANON_KEY not set — using in-memory store fallback");
} else {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log("✅ Supabase client connected:", supabaseUrl);
  } catch (error) {
    console.error("❌ Failed to initialize Supabase:", error.message);
    supabase = null;
  }
}

module.exports = supabase;
