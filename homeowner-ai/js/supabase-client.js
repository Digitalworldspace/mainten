/**
 * SUPABASE CONNECTION
 * ------------------------------------------------------------------
 * 1. Create a free project at https://supabase.com
 * 2. Project Settings → API → copy "Project URL" and "anon public" key
 * 3. Paste them below. The anon key is safe to expose in frontend code
 *    — access is controlled by the Row Level Security policies in
 *    supabase/schema.sql, not by hiding this key.
 * ------------------------------------------------------------------
 */
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEMO_MODE = SUPABASE_URL.includes("YOUR-PROJECT-REF");
