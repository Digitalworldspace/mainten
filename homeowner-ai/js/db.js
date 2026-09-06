/**
 * DATA LAYER — no Supabase Auth
 * ------------------------------------------------------------------
 * This project never touches supabase.auth.* — accounts live in a
 * plain `public.users` table (see supabase/schema.sql), managed the
 * same way any other table is. "Logging in" just means: look up the
 * row by email, check the password hash, and remember the user's id
 * in localStorage as a lightweight client-side session.
 *
 * DEMO_MODE (no Supabase keys yet) skips the database entirely and
 * keeps everything in localStorage so the app works immediately.
 * ------------------------------------------------------------------
 */
const LS_KEY = "hoa_demo_store_v1";
const SESSION_KEY = "hoa_session_v1";

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY)) || { users: {}, session: null };
  } catch (e) {
    return { users: {}, session: null };
  }
}
function saveLocal(store) {
  localStorage.setItem(LS_KEY, JSON.stringify(store));
}
function uid() {
  return "id_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ---------- session (used only in real-Supabase mode; demo mode keeps its own) ----------
function getSessionUser() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
}
function setSessionUser(u) { localStorage.setItem(SESSION_KEY, JSON.stringify(u)); }
function clearSessionUser() { localStorage.removeItem(SESSION_KEY); }

// ---------- password hashing (client-side, before it ever reaches Supabase) ----------
function randomSalt() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}
async function hashPassword(password, salt) {
  if (window.crypto?.subtle) {
    const enc = new TextEncoder().encode(salt + ":" + password);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
  }
  // Fallback if Web Crypto isn't available (e.g. very old browser). Not secure — upgrade before real use.
  let h = 0;
  const s = salt + ":" + password;
  for (let i = 0; i < s.length; i++) { h = (h << 5) - h + s.charCodeAt(i); h |= 0; }
  return "fallback_" + h;
}

const DB = {
  // ---------- AUTH (plain `users` table, no Supabase Auth) ----------
  async signUp(email, password, fullName) {
    if (DEMO_MODE) {
      const store = loadLocal();
      if (store.users[email]) throw new Error("An account with that email already exists.");
      const userId = uid();
      store.users[email] = {
        id: userId, email, password, fullName,
        profile: { plan: "free", created_at: new Date().toISOString() },
        home: null, tasks: [], expenses: [], insights: []
      };
      store.session = email;
      saveLocal(store);
      return { id: userId, email };
    }
    const { data: existing } = await supabaseClient.from("users").select("id").eq("email", email).maybeSingle();
    if (existing) throw new Error("An account with that email already exists.");
    const salt = randomSalt();
    const password_hash = await hashPassword(password, salt);
    const { data, error } = await supabaseClient
      .from("users")
      .insert({ email, password_hash, salt, full_name: fullName })
      .select().single();
    if (error) throw new Error(error.message);
    setSessionUser({ id: data.id, email: data.email });
    return data;
  },

  async signIn(email, password) {
    if (DEMO_MODE) {
      const store = loadLocal();
      const u = store.users[email];
      if (!u || u.password !== password) throw new Error("Incorrect email or password.");
      store.session = email;
      saveLocal(store);
      return u;
    }
    const { data: row, error } = await supabaseClient.from("users").select("*").eq("email", email).maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Incorrect email or password.");
    const hash = await hashPassword(password, row.salt);
    if (hash !== row.password_hash) throw new Error("Incorrect email or password.");
    setSessionUser({ id: row.id, email: row.email });
    return row;
  },

  async signOut() {
    if (DEMO_MODE) {
      const store = loadLocal();
      store.session = null;
      saveLocal(store);
      return;
    }
    clearSessionUser();
  },

  async getSession() {
    if (DEMO_MODE) {
      const store = loadLocal();
      if (!store.session) return null;
      const u = store.users[store.session];
      return u ? { user: { id: u.id, email: u.email } } : null;
    }
    const s = getSessionUser();
    return s ? { user: { id: s.id, email: s.email } } : null;
  },

  // ---------- PROFILE (plan lives directly on the users row) ----------
  async getProfile(email) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.profile || null;
    }
    const s = getSessionUser();
    if (!s) return null;
    const { data, error } = await supabaseClient.from("users").select("plan, plan_updated_at, created_at").eq("id", s.id).single();
    if (error) throw new Error(error.message);
    return data;
  },

  async setPlan(email, plan) {
    if (DEMO_MODE) {
      const store = loadLocal();
      store.users[email].profile.plan = plan;
      store.users[email].profile.plan_updated_at = new Date().toISOString();
      saveLocal(store);
      return;
    }
    const s = getSessionUser();
    const { error } = await supabaseClient
      .from("users")
      .update({ plan, plan_updated_at: new Date().toISOString() })
      .eq("id", s.id);
    if (error) throw new Error(error.message);
  },

  // ---------- HOME ----------
  async getHome(email) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.home || null;
    }
    const s = getSessionUser();
    const { data, error } = await supabaseClient
      .from("homes").select("*").eq("user_id", s.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  },

  async saveHome(email, home) {
    if (DEMO_MODE) {
      const store = loadLocal();
      const existing = store.users[email].home;
      store.users[email].home = { id: existing?.id || uid(), ...existing, ...home };
      saveLocal(store);
      return store.users[email].home;
    }
    const s = getSessionUser();
    const payload = { ...home, user_id: s.id };
    if (home.id) {
      const { data, error } = await supabaseClient.from("homes").update(payload).eq("id", home.id).select().single();
      if (error) throw new Error(error.message);
      return data;
    }
    delete payload.id;
    const { data, error } = await supabaseClient.from("homes").insert(payload).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ---------- MAINTENANCE TASKS ----------
  async listTasks(email, homeId) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.tasks || [];
    }
    const { data, error } = await supabaseClient.from("maintenance_tasks").select("*").eq("home_id", homeId).order("due_date");
    if (error) throw new Error(error.message);
    return data;
  },

  async saveTasks(email, homeId, tasks) {
    if (DEMO_MODE) {
      const store = loadLocal();
      store.users[email].tasks = tasks.map(t => ({ id: t.id || uid(), ...t }));
      saveLocal(store);
      return store.users[email].tasks;
    }
    const rows = tasks.map(t => ({ ...t, home_id: homeId }));
    const { data, error } = await supabaseClient.from("maintenance_tasks").upsert(rows).select();
    if (error) throw new Error(error.message);
    return data;
  },

  async updateTaskStatus(email, taskId, status) {
    if (DEMO_MODE) {
      const store = loadLocal();
      const t = store.users[email].tasks.find(x => x.id === taskId);
      if (t) t.status = status;
      saveLocal(store);
      return;
    }
    const { error } = await supabaseClient.from("maintenance_tasks").update({ status }).eq("id", taskId);
    if (error) throw new Error(error.message);
  },

  // ---------- EXPENSES ----------
  async listExpenses(email, homeId) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.expenses || [];
    }
    const { data, error } = await supabaseClient.from("expenses").select("*").eq("home_id", homeId).order("expense_date", { ascending: false });
    if (error) throw new Error(error.message);
    return data;
  },

  async addExpense(email, homeId, expense) {
    if (DEMO_MODE) {
      const store = loadLocal();
      const row = { id: uid(), home_id: homeId, ...expense };
      store.users[email].expenses.unshift(row);
      saveLocal(store);
      return row;
    }
    const { data, error } = await supabaseClient.from("expenses").insert({ ...expense, home_id: homeId }).select().single();
    if (error) throw new Error(error.message);
    return data;
  },

  // ---------- AI INSIGHTS ----------
  async listInsights(email, homeId) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.insights || [];
    }
    const { data, error } = await supabaseClient.from("ai_insights").select("*").eq("home_id", homeId).order("sort_order");
    if (error) throw new Error(error.message);
    return data;
  },

  async saveInsights(email, homeId, insights) {
    if (DEMO_MODE) {
      const store = loadLocal();
      store.users[email].insights = insights.map(i => ({ id: i.id || uid(), ...i }));
      saveLocal(store);
      return store.users[email].insights;
    }
    const rows = insights.map(i => ({ ...i, home_id: homeId }));
    const { data, error } = await supabaseClient.from("ai_insights").insert(rows).select();
    if (error) throw new Error(error.message);
    return data;
  }
};
