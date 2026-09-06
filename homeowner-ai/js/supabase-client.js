/**
 * SUPABASE CONNECTION
 * ------------------------------------------------------------------
 * This project only uses Supabase as a plain Postgres database — the
 * Table Editor and SQL editor are the only parts of Supabase you need
 * to touch. Supabase Auth is not used anywhere (see js/db.js and the
 * security note at the bottom of supabase/schema.sql).
 *
 * 1. Create a free project at https://supabase.com
 * 2. SQL Editor → run supabase/schema.sql once
 * 3. Project Settings → API → copy "Project URL" and "anon public" key
 * 4. Paste them below.
 *
 * Because Row Level Security is off (there's no Supabase Auth session
 * to check it against), the anon key can read/write every row in these
 * tables. That's fine for building and demoing — read the security
 * note in supabase/schema.sql before you launch with real users.
 * ------------------------------------------------------------------
 */
const SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-PUBLIC-KEY";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const DEMO_MODE = SUPABASE_URL.includes("YOUR-PROJECT-REF");
