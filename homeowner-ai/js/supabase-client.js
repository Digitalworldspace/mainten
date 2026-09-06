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
const SUPABASE_URL = "https://vpnvhyxqfcnzkydgsokh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZwbnZoeXhxZmNuemt5ZGdzb2toIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg2NjA0MTcsImV4cCI6MjEwNDIzNjQxN30.1krHp3-cc7i54XTrHRwKOsaE48jRRitW3JBvtcWoMZ4";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEMO_MODE = SUPABASE_URL.includes("YOUR-PROJECT-REF");
