/**
 * DATA LAYER
 * ------------------------------------------------------------------
 * A thin wrapper so the rest of the app never has to know whether it's
 * talking to real Supabase or the local "demo mode" fallback. Once you
 * add your Supabase keys in js/supabase-client.js, DEMO_MODE turns off
 * automatically and every call below hits your real database.
 * ------------------------------------------------------------------
 */
const LS_KEY = "hoa_demo_store_v1";

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

const DB = {
  // ---------- AUTH ----------
  async signUp(email, password, fullName) {
    if (DEMO_MODE) {
      const store = loadLocal();
      if (store.users[email]) throw new Error("An account with that email already exists.");
      const userId = uid();
      store.users[email] = {
        id: userId, email, password, fullName,
        profile: { plan: "free", insights_unlocked_this_month: 3, created_at: new Date().toISOString() },
        home: null, tasks: [], expenses: [], insights: []
      };
      store.session = email;
      saveLocal(store);
      return { id: userId, email };
    }
    const { data, error } = await supabaseClient.auth.signUp({
      email, password, options: { data: { full_name: fullName } }
    });
    if (error) throw error;
    return data.user;
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
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async signOut() {
    if (DEMO_MODE) {
      const store = loadLocal();
      store.session = null;
      saveLocal(store);
      return;
    }
    await supabaseClient.auth.signOut();
  },

  async getSession() {
    if (DEMO_MODE) {
      const store = loadLocal();
      if (!store.session) return null;
      const u = store.users[store.session];
      return u ? { user: { id: u.id, email: u.email } } : null;
    }
    const { data } = await supabaseClient.auth.getSession();
    return data.session;
  },

  // ---------- PROFILE ----------
  async getProfile(email) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.profile || null;
    }
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const { data, error } = await supabaseClient
      .from("profiles").select("*").eq("id", sessionData.session.user.id).single();
    if (error) throw error;
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
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const { error } = await supabaseClient
      .from("profiles")
      .update({ plan, plan_updated_at: new Date().toISOString() })
      .eq("id", sessionData.session.user.id);
    if (error) throw error;
  },

  // ---------- HOME ----------
  async getHome(email) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.home || null;
    }
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const { data, error } = await supabaseClient
      .from("homes").select("*").eq("user_id", sessionData.session.user.id)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (error) throw error;
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
    const { data: sessionData } = await supabaseClient.auth.getSession();
    const payload = { ...home, user_id: sessionData.session.user.id };
    if (home.id) {
      const { data, error } = await supabaseClient.from("homes").update(payload).eq("id", home.id).select().single();
      if (error) throw error;
      return data;
    }
    const { data, error } = await supabaseClient.from("homes").insert(payload).select().single();
    if (error) throw error;
    return data;
  },

  // ---------- MAINTENANCE TASKS ----------
  async listTasks(email, homeId) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.tasks || [];
    }
    const { data, error } = await supabaseClient.from("maintenance_tasks").select("*").eq("home_id", homeId).order("due_date");
    if (error) throw error;
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
    if (error) throw error;
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
    if (error) throw error;
  },

  // ---------- EXPENSES ----------
  async listExpenses(email, homeId) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.expenses || [];
    }
    const { data, error } = await supabaseClient.from("expenses").select("*").eq("home_id", homeId).order("expense_date", { ascending: false });
    if (error) throw error;
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
    if (error) throw error;
    return data;
  },

  // ---------- AI INSIGHTS ----------
  async listInsights(email, homeId) {
    if (DEMO_MODE) {
      const store = loadLocal();
      return store.users[email]?.insights || [];
    }
    const { data, error } = await supabaseClient.from("ai_insights").select("*").eq("home_id", homeId).order("sort_order");
    if (error) throw error;
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
    if (error) throw error;
    return data;
  }
};
