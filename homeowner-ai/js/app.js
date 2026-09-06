/* ==========================================================
   HEARTH LEDGER — app.js
   Minimal hash-router SPA. No framework — small enough not to need one.
   ========================================================== */
const FREE_UNLOCK_LIMIT = 7; // items 1-7 visible on Free; 8-10 require Plus/Pro
const root = document.getElementById("root");

const STATE = { session: null, email: null, profile: null, home: null, tasks: [], expenses: [], insights: [] };

function money(n) { return "$" + Math.round(Number(n) || 0).toLocaleString("en-US"); }
function esc(s) { return (s ?? "").toString().replace(/[&<>"']/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[m])); }

function computeMonthlyCostBreakdown(home) {
  const mortgage = Number(home.mortgage_monthly) || 0;
  const insurance = Number(home.insurance_monthly) || 0;
  const tax = (Number(home.property_tax_annual) || 0) / 12;
  const utilities = Number(home.utilities_monthly) || 0;
  const hoa = Number(home.hoa_monthly) || 0;
  const value = Number(home.home_value) || 0;
  const age = home.year_built ? new Date().getFullYear() - home.year_built : null;
  const pct = age && age > 30 ? MARKET.maintenanceRuleHighPct : MARKET.maintenanceRuleLowPct;
  const maintenanceReserve = (value * (pct / 100)) / 12;
  const total = mortgage + insurance + tax + utilities + hoa + maintenanceReserve;
  return { mortgage, insurance, tax, utilities, hoa, maintenanceReserve, total };
}

/* ---------------------------- ROUTER ---------------------------- */
window.addEventListener("hashchange", route);
window.addEventListener("DOMContentLoaded", route);

async function route() {
  let hash = location.hash || "#/login";
  const [path, queryStr] = hash.split("?");
  const params = new URLSearchParams(queryStr || "");

  const session = await DB.getSession();
  STATE.session = session;

  if (!session) {
    if (path === "#/signup") return renderAuth("signup", params);
    return renderAuth("login", params);
  }

  STATE.email = session.user.email;
  STATE.profile = await DB.getProfile(STATE.email) || { plan: "free" };
  STATE.home = await DB.getHome(STATE.email);

  if (!STATE.home && path !== "#/onboarding") { location.hash = "#/onboarding"; return; }

  switch (path) {
    case "#/onboarding": return renderOnboarding();
    case "#/maintenance": return renderMaintenance();
    case "#/expenses": return renderExpenses();
    case "#/pro": return renderPro();
    case "#/settings": return renderSettings();
    case "#/dashboard": default: return renderDashboard();
  }
}

/* ---------------------------- AUTH VIEWS ---------------------------- */
function renderAuth(mode, params) {
  const plan = params?.get("plan") || "";
  root.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card">
      <a href="index.html" class="brand" style="margin-bottom:22px;display:inline-flex;">
        <svg width="24" height="24" viewBox="0 0 26 26" fill="none"><path d="M3 13L13 4L23 13" stroke="#16232E" stroke-width="2"/><path d="M6 11V22H20V11" stroke="#16232E" stroke-width="2"/><path d="M11 22V16H15V22" stroke="#AE4128" stroke-width="2"/></svg>
        Hearth Ledger
      </a>
      <div class="auth-toggle">
        <button class="${mode === "login" ? "active" : ""}" onclick="location.hash='#/login'">Log in</button>
        <button class="${mode === "signup" ? "active" : ""}" onclick="location.hash='#/signup${plan ? "?plan=" + plan : ""}'">Sign up</button>
      </div>
      <h2>${mode === "login" ? "Welcome back" : "Add your home"}</h2>
      <p class="sub">${mode === "login" ? "Log in to see this month's plan." : "Free to start. Two minutes to set up."}</p>
      ${DEMO_MODE ? `<div class="info-msg">Demo mode: no Supabase project connected yet, so your account lives only in this browser. Add your keys in <span class="mono">js/supabase-client.js</span> to make it real.</div>` : ""}
      <div id="authError"></div>
      <form id="authForm">
        ${mode === "signup" ? `<div class="field"><label>Full name</label><input type="text" id="authName" placeholder="Jordan Smith" required></div>` : ""}
        <div class="field"><label>Email</label><input type="email" id="authEmail" placeholder="you@email.com" required></div>
        <div class="field"><label>Password</label><input type="password" id="authPassword" placeholder="At least 6 characters" minlength="6" required></div>
        <button type="submit" class="btn block" id="authSubmit">${mode === "login" ? "Log in" : "Create free account"}</button>
      </form>
    </div>
  </div>`;

  document.getElementById("authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    const errBox = document.getElementById("authError");
    errBox.innerHTML = "";
    const btn = document.getElementById("authSubmit");
    btn.disabled = true; btn.textContent = "Please wait…";
    try {
      if (mode === "signup") {
        const name = document.getElementById("authName").value.trim();
        await DB.signUp(email, password, name);
        if (plan) sessionStorage.setItem("pendingPlan", plan);
        await DB.signIn(email, password);
      } else {
        await DB.signIn(email, password);
      }
      location.hash = "#/dashboard";
      route();
    } catch (err) {
      errBox.innerHTML = `<div class="error-msg">${esc(err.message || "Something went wrong.")}</div>`;
      btn.disabled = false; btn.textContent = mode === "login" ? "Log in" : "Create free account";
    }
  });
}

async function logout() { await DB.signOut(); location.hash = "#/login"; route(); }

/* ---------------------------- APP SHELL ---------------------------- */
function shell(activePath, contentHtml) {
  const plan = STATE.profile?.plan || "free";
  root.innerHTML = `
  <div class="app-shell">
    <aside class="app-sidebar">
      <a href="index.html" class="brand">
        <svg width="22" height="22" viewBox="0 0 26 26" fill="none"><path d="M3 13L13 4L23 13" stroke="#F5F2EA" stroke-width="2"/><path d="M6 11V22H20V11" stroke="#F5F2EA" stroke-width="2"/><path d="M11 22V16H15V22" stroke="#D97757" stroke-width="2"/></svg>
        Hearth Ledger
      </a>
      <a class="side-link ${activePath === "dashboard" ? "active" : ""}" href="#/dashboard">01 · Dashboard</a>
      <a class="side-link ${activePath === "maintenance" ? "active" : ""}" href="#/maintenance">02 · Maintenance</a>
      <a class="side-link ${activePath === "expenses" ? "active" : ""}" href="#/expenses">03 · Cost tracking${plan === "free" ? " 🔒" : ""}</a>
      <a class="side-link ${activePath === "pro" ? "active" : ""}" href="#/pro">04 · Pro tools${plan !== "pro" ? " 🔒" : ""}</a>
      <a class="side-link ${activePath === "settings" ? "active" : ""}" href="#/settings">05 · Settings</a>
      <div class="side-plan">
        <div class="plan-name">${plan} plan</div>
        ${plan !== "pro" ? `<button class="btn small block" onclick="openUpgradeModal()">Upgrade</button>` : `<div style="font-size:12px;color:rgba(245,242,234,.6)">Everything unlocked</div>`}
        <button class="btn ghost small block" style="margin-top:8px;color:#F5F2EA;border-color:rgba(245,242,234,.3)" onclick="logout()">Log out</button>
      </div>
    </aside>
    <main class="app-main">${contentHtml}</main>
  </div>`;
}

/* ---------------------------- ONBOARDING ---------------------------- */
function renderOnboarding() {
  const h = STATE.home || {};
  root.innerHTML = `
  <div class="auth-wrap">
    <div class="auth-card" style="max-width:560px;">
      <h2>${STATE.home ? "Edit your home profile" : "Tell us about your home"}</h2>
      <p class="sub">These numbers power everything else — your dashboard, your monthly plan, and your savings comparisons.</p>
      <form id="onboardForm">
        <div class="field"><label>Nickname</label><input id="f_nickname" value="${esc(h.nickname || "My Home")}"></div>
        <div class="field"><label>City, State</label><input id="f_location" placeholder="Austin, TX" value="${esc(h.location || "")}" required></div>
        <div class="field-row">
          <div class="field"><label>Estimated home value</label><input type="number" id="f_value" placeholder="425000" value="${h.home_value || ""}" required></div>
          <div class="field"><label>Year built</label><input type="number" id="f_year" placeholder="1998" value="${h.year_built || ""}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Mortgage payment / month</label><input type="number" id="f_mortgage" placeholder="1950" value="${h.mortgage_monthly || ""}"></div>
          <div class="field"><label>Insurance payment / month</label><input type="number" id="f_insurance" placeholder="${Math.round(MARKET.avgHomeInsuranceMonthly)}" value="${h.insurance_monthly || ""}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Property tax / year</label><input type="number" id="f_tax" placeholder="${MARKET.avgAnnualPropertyTax}" value="${h.property_tax_annual || ""}"></div>
          <div class="field"><label>Tax due date</label><input type="date" id="f_taxdate" value="${h.property_tax_due_date || ""}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Insurance renewal date</label><input type="date" id="f_insdate" value="${h.insurance_renewal_date || ""}"></div>
          <div class="field"><label>Utilities / month</label><input type="number" id="f_utilities" placeholder="375" value="${h.utilities_monthly || ""}"></div>
        </div>
        <div class="field-row">
          <div class="field"><label>Last HVAC service</label><input type="date" id="f_hvac" value="${h.last_hvac_service || ""}"></div>
          <div class="field"><label>Last gutter cleaning</label><input type="date" id="f_gutter" value="${h.last_gutter_cleaning || ""}"></div>
        </div>
        <div id="onboardError"></div>
        <button type="submit" class="btn block">Save home profile</button>
      </form>
    </div>
  </div>`;

  document.getElementById("onboardForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const home = {
      id: STATE.home?.id,
      nickname: document.getElementById("f_nickname").value.trim() || "My Home",
      location: document.getElementById("f_location").value.trim(),
      home_value: Number(document.getElementById("f_value").value) || 0,
      year_built: Number(document.getElementById("f_year").value) || null,
      mortgage_monthly: Number(document.getElementById("f_mortgage").value) || 0,
      insurance_monthly: Number(document.getElementById("f_insurance").value) || 0,
      property_tax_annual: Number(document.getElementById("f_tax").value) || 0,
      property_tax_due_date: document.getElementById("f_taxdate").value || null,
      insurance_renewal_date: document.getElementById("f_insdate").value || null,
      utilities_monthly: Number(document.getElementById("f_utilities").value) || 0,
      last_hvac_service: document.getElementById("f_hvac").value || null,
      last_gutter_cleaning: document.getElementById("f_gutter").value || null
    };
    try {
      STATE.home = await DB.saveHome(STATE.email, home);
      const tasks = await DB.listTasks(STATE.email, STATE.home.id);
      const insights = generateInsights(STATE.home, tasks);
      await DB.saveInsights(STATE.email, STATE.home.id, insights);
      const pendingPlan = sessionStorage.getItem("pendingPlan");
      if (pendingPlan) { sessionStorage.removeItem("pendingPlan"); await DB.setPlan(STATE.email, pendingPlan); }
      location.hash = "#/dashboard";
      route();
    } catch (err) {
      document.getElementById("onboardError").innerHTML = `<div class="error-msg">${esc(err.message)}</div>`;
    }
  });
}

/* ---------------------------- DASHBOARD ---------------------------- */
async function renderDashboard() {
  const home = STATE.home;
  STATE.tasks = await DB.listTasks(STATE.email, home.id);
  let insights = await DB.listInsights(STATE.email, home.id);
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (!insights.length || !insights[0].month || !insights[0].month.startsWith(thisMonth)) {
    insights = generateInsights(home, STATE.tasks);
    await DB.saveInsights(STATE.email, home.id, insights);
  }
  STATE.insights = insights;
  const plan = STATE.profile.plan;
  const unlocked = plan === "free" ? FREE_UNLOCK_LIMIT : 10;
  const score = computeHomeHealthScore(home, STATE.tasks);
  const scoreColor = score >= 75 ? "var(--moss)" : score >= 50 ? "var(--gold)" : "var(--brick)";
  const costs = computeMonthlyCostBreakdown(home);

  const insuranceAnnual = (home.insurance_monthly || 0) * 12;
  const insuranceVsAvg = insuranceAnnual - MARKET.avgHomeInsuranceAnnual;

  shell("dashboard", `
    <div class="app-header">
      <div>
        <h1>${esc(home.nickname)}</h1>
        <p>${esc(home.location || "")} — here's what's worth your attention this month.</p>
      </div>
      <div class="gauge-wrap">
        <svg width="72" height="72" viewBox="0 0 72 72">
          <circle cx="36" cy="36" r="30" fill="none" stroke="var(--line)" stroke-width="7"/>
          <circle cx="36" cy="36" r="30" fill="none" stroke="${scoreColor}" stroke-width="7"
            stroke-dasharray="${(score/100)*188.5} 188.5" stroke-linecap="round" transform="rotate(-90 36 36)"/>
        </svg>
        <div>
          <div class="gauge-num">${score}</div>
          <div class="gauge-label">home health</div>
        </div>
      </div>
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>This month's plan</h3>
        <div class="card-sub">Ranked by what needs attention first — ${plan === "free" ? `${FREE_UNLOCK_LIMIT} of 10 items unlocked on Free` : "all 10 items unlocked"}.</div>
        ${renderInsightsList(insights, unlocked)}
        ${plan === "free" ? `
        <div class="progress-track"><div class="progress-fill" style="width:${(unlocked/10)*100}%"></div></div>
        <div class="paywall-strip">
          <div><strong>3 more recommendations are ready</strong><p>Unlock items 8–10 and get a new full plan every month with Plus.</p></div>
          <button class="btn brick small" onclick="openUpgradeModal()">Unlock for $9/mo</button>
        </div>` : ""}
      </div>

      <div>
        <div class="card">
          <h3>Monthly home cost</h3>
          <div class="card-sub">What this home actually costs you, per month.</div>
          <div class="ledger-line"><span class="ll-label">Mortgage</span><span class="ll-value">${money(costs.mortgage)}</span></div>
          <div class="ledger-line"><span class="ll-label">Insurance</span><span class="ll-value">${money(costs.insurance)}</span></div>
          <div class="ledger-line"><span class="ll-label">Property tax</span><span class="ll-value">${money(costs.tax)}</span></div>
          <div class="ledger-line"><span class="ll-label">Utilities</span><span class="ll-value">${money(costs.utilities)}</span></div>
          <div class="ledger-line"><span class="ll-label">Maintenance reserve</span><span class="ll-value">${money(costs.maintenanceReserve)}</span></div>
          <div class="ledger-line total"><span class="ll-label">Total / month</span><span class="ll-value">${money(costs.total)}</span></div>
        </div>

        <div class="card">
          <h3>Due soon</h3>
          <div class="card-sub">From your home profile.</div>
          ${renderDueSoon(home)}
        </div>
      </div>
    </div>

    <div class="grid-3">
      <div class="card">
        <h3>Insurance vs. market</h3>
        <div class="card-sub mono">2026 national avg: ${money(MARKET.avgHomeInsuranceAnnual)}/yr</div>
        <div class="ledger-line"><span class="ll-label">You pay</span><span class="ll-value">${money(insuranceAnnual)}/yr</span></div>
        <div class="ledger-line total"><span class="ll-label">${insuranceVsAvg > 0 ? "Above average by" : "Below average by"}</span><span class="ll-value" style="color:${insuranceVsAvg>0?"var(--brick)":"var(--moss)"}">${money(Math.abs(insuranceVsAvg))}</span></div>
      </div>
      <div class="card">
        <h3>Mortgage rate context</h3>
        <div class="card-sub mono">Freddie Mac, Sept 2026</div>
        <div class="ledger-line"><span class="ll-label">30-yr national avg</span><span class="ll-value">${MARKET.avgMortgageRate30yr}%</span></div>
        <div class="ledger-line"><span class="ll-label">15-yr national avg</span><span class="ll-value">${MARKET.avgMortgageRate15yr}%</span></div>
      </div>
      <div class="card">
        <h3>Pro tools</h3>
        <div class="card-sub">Savings finder, document analysis, home value tracking, annual report.</div>
        <a href="#/pro" class="btn ${plan === "pro" ? "" : "ghost"} small block">${plan === "pro" ? "Open Pro tools" : "Preview Pro 🔒"}</a>
      </div>
    </div>
  `);
}

function renderInsightsList(insights, unlockedCount) {
  return insights.map((it, i) => {
    const locked = i >= unlockedCount;
    return `
    <div class="insight-row ${locked ? "locked" : ""}">
      <div class="insight-num">${String(i + 1).padStart(2, "0")}</div>
      <div class="insight-body" style="flex:1">
        <div style="display:flex;justify-content:space-between;gap:10px;align-items:baseline;">
          <h4>${esc(it.title)}</h4>
          <span class="pill ${it.priority}">${it.priority}</span>
        </div>
        <p>${esc(it.description)}</p>
      </div>
      ${locked ? `<div style="align-self:center;"><span class="tag-lock">🔒 Plus</span></div>` : ""}
    </div>`;
  }).join("");
}

function renderDueSoon(home) {
  const rows = [];
  const insDays = daysUntil(home.insurance_renewal_date);
  if (insDays !== null) rows.push({ label: "Insurance renewal", days: insDays });
  const taxDays = daysUntil(home.property_tax_due_date);
  if (taxDays !== null) rows.push({ label: "Property tax payment", days: taxDays });
  if (!rows.length) return `<p class="empty-state">Add renewal and tax dates in Settings to see countdowns here.</p>`;
  return rows.map(r => `
    <div class="ledger-line">
      <span class="ll-label">${esc(r.label)}</span>
      <span class="pill ${r.days < 0 ? "high" : r.days <= 21 ? "high" : r.days <= 60 ? "medium" : "low"}">${r.days < 0 ? "overdue" : r.days + " days"}</span>
    </div>`).join("");
}

/* ---------------------------- MAINTENANCE ---------------------------- */
async function renderMaintenance() {
  const home = STATE.home;
  STATE.tasks = await DB.listTasks(STATE.email, home.id);
  const plan = STATE.profile.plan;
  const fullAccess = plan !== "free";

  const defaults = [
    { title: "Replace HVAC filter", category: "HVAC", months: 3 },
    { title: "HVAC seasonal tune-up", category: "HVAC", months: 6 },
    { title: "Clean gutters", category: "Exterior", months: 6 },
    { title: "Test smoke & CO detectors", category: "Safety", months: 6 },
    { title: "Flush water heater", category: "Plumbing", months: 12 },
    { title: "Inspect roof & flashing", category: "Exterior", months: 12 }
  ];

  const visibleTasks = fullAccess ? STATE.tasks : STATE.tasks.slice(0, 3);

  shell("maintenance", `
    <div class="app-header"><div><h1>Maintenance</h1><p>Recurring upkeep, tracked so nothing gets forgotten.</p></div></div>

    <div class="card">
      <h3>Your schedule</h3>
      <div class="card-sub">${STATE.tasks.length} task${STATE.tasks.length === 1 ? "" : "s"} tracked.</div>
      ${visibleTasks.length ? visibleTasks.map(t => `
        <div class="checklist-item ${t.status === "done" ? "done" : ""}">
          <input type="checkbox" ${t.status === "done" ? "checked" : ""} onchange="toggleTask('${t.id}', this.checked)">
          <div>
            <div class="ci-title">${esc(t.title)}</div>
            <div class="ci-meta">${esc(t.category)}${t.due_date ? " · due " + t.due_date : ""}</div>
          </div>
        </div>`).join("") : `<p class="empty-state">No tasks yet — add one below, or load the standard homeowner checklist.</p>`}
      ${!fullAccess && STATE.tasks.length > 3 ? `
      <div class="paywall-strip">
        <div><strong>${STATE.tasks.length - 3} more tasks are hidden</strong><p>Free shows your next 3 tasks. Plus unlocks your full schedule.</p></div>
        <button class="btn brick small" onclick="openUpgradeModal()">Unlock schedule</button>
      </div>` : ""}
    </div>

    ${fullAccess ? `
    <div class="card">
      <h3>Add a task</h3>
      <form id="taskForm">
        <div class="field-row">
          <div class="field"><label>Task</label><input id="t_title" placeholder="Replace HVAC filter" required></div>
          <div class="field"><label>Category</label><input id="t_category" placeholder="HVAC" value="General"></div>
        </div>
        <div class="field"><label>Due date</label><input type="date" id="t_due"></div>
        <button class="btn small">Add task</button>
      </form>
    </div>
    <div class="card">
      <h3>Standard homeowner checklist</h3>
      <div class="card-sub">Load common recurring tasks with realistic intervals in one click.</div>
      <button class="btn ghost small" onclick="loadDefaultTasks()">Add standard checklist</button>
    </div>` : `
    <div class="locked-panel">
      <h3>Full maintenance schedule is a Plus feature</h3>
      <p>Add unlimited tasks, set recurring intervals, and see your complete upkeep calendar.</p>
      <button class="btn brick" onclick="openUpgradeModal()">Upgrade to Plus — $9/mo</button>
    </div>`}
  `);

  const form = document.getElementById("taskForm");
  if (form) form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const newTask = {
      title: document.getElementById("t_title").value.trim(),
      category: document.getElementById("t_category").value.trim() || "General",
      status: "pending",
      due_date: document.getElementById("t_due").value || null
    };
    STATE.tasks = await DB.saveTasks(STATE.email, home.id, [...STATE.tasks, newTask]);
    renderMaintenance();
  });

  window.loadDefaultTasks = async function () {
    const today = new Date();
    const rows = defaults.map(d => {
      const due = new Date(today); due.setMonth(due.getMonth() + 1);
      return { title: d.title, category: d.category, status: "pending", due_date: due.toISOString().slice(0, 10), recurring_interval_months: d.months };
    });
    STATE.tasks = await DB.saveTasks(STATE.email, home.id, [...STATE.tasks, ...rows]);
    renderMaintenance();
  };
}

window.toggleTask = async function (taskId, checked) {
  await DB.updateTaskStatus(STATE.email, taskId, checked ? "done" : "pending");
  renderMaintenance();
};

/* ---------------------------- EXPENSES ---------------------------- */
async function renderExpenses() {
  const home = STATE.home;
  const plan = STATE.profile.plan;
  if (plan === "free") {
    shell("expenses", `
      <div class="app-header"><div><h1>Cost tracking</h1><p>Log real expenses and compare them to your budget.</p></div></div>
      <div class="locked-panel">
        <h3>Cost tracking is a Plus feature</h3>
        <p>Log every home expense, see monthly totals by category, and catch spending drift before it becomes a problem.</p>
        <button class="btn brick" onclick="openUpgradeModal()">Upgrade to Plus — $9/mo</button>
      </div>`);
    return;
  }
  STATE.expenses = await DB.listExpenses(STATE.email, home.id);
  const total = STATE.expenses.reduce((s, e) => s + Number(e.amount), 0);
  const byCat = {};
  STATE.expenses.forEach(e => { byCat[e.category] = (byCat[e.category] || 0) + Number(e.amount); });

  shell("expenses", `
    <div class="app-header"><div><h1>Cost tracking</h1><p>Everything you've logged for ${esc(home.nickname)}.</p></div></div>
    <div class="grid-2">
      <div class="card">
        <h3>Log an expense</h3>
        <form id="expenseForm">
          <div class="field-row">
            <div class="field"><label>Category</label><input id="e_category" placeholder="HVAC repair" required></div>
            <div class="field"><label>Amount</label><input type="number" id="e_amount" placeholder="180" required></div>
          </div>
          <div class="field"><label>Date</label><input type="date" id="e_date" value="${new Date().toISOString().slice(0,10)}"></div>
          <button class="btn small">Add expense</button>
        </form>
      </div>
      <div class="card">
        <h3>By category</h3>
        ${Object.keys(byCat).length ? Object.entries(byCat).map(([c, amt]) => `
          <div class="ledger-line"><span class="ll-label">${esc(c)}</span><span class="ll-value">${money(amt)}</span></div>`).join("")
          + `<div class="ledger-line total"><span class="ll-label">Total logged</span><span class="ll-value">${money(total)}</span></div>`
          : `<p class="empty-state">No expenses logged yet.</p>`}
      </div>
    </div>
    <div class="card">
      <h3>Recent expenses</h3>
      ${STATE.expenses.length ? STATE.expenses.map(e => `
        <div class="ledger-line"><span class="ll-label">${esc(e.expense_date)} — ${esc(e.category)}</span><span class="ll-value">${money(e.amount)}</span></div>`).join("")
        : `<p class="empty-state">Nothing logged yet — add your first expense above.</p>`}
    </div>
  `);

  document.getElementById("expenseForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await DB.addExpense(STATE.email, home.id, {
      category: document.getElementById("e_category").value.trim(),
      amount: Number(document.getElementById("e_amount").value),
      expense_date: document.getElementById("e_date").value
    });
    renderExpenses();
  });
}

/* ---------------------------- PRO TOOLS ---------------------------- */
async function renderPro() {
  const home = STATE.home;
  const plan = STATE.profile.plan;
  if (plan !== "pro") {
    shell("pro", `
      <div class="app-header"><div><h1>Pro tools</h1><p>Savings finder, document analysis, home value tracking, annual report.</p></div></div>
      <div class="locked-panel">
        <h3>Pro tools are part of the Pro plan</h3>
        <p>See exactly where you're overpaying, upload a policy for a quick read, track your home's value over time, and generate a shareable annual report.</p>
        <button class="btn brick" onclick="openUpgradeModal()">Upgrade to Pro — $19/mo</button>
      </div>`);
    return;
  }
  const insights = await DB.listInsights(STATE.email, home.id);
  const savingsTotal = insights.reduce((s, i) => s + (Number(i.potential_savings) || 0), 0);
  const baseValue = Number(home.home_value) || 400000;
  const trend = [0.94, 0.96, 0.97, 0.99, 1.0, 1.02, 1.03].map(m => Math.round(baseValue * m));

  shell("pro", `
    <div class="app-header"><div><h1>Pro tools</h1><p>The deeper, ongoing analysis layer.</p></div></div>

    <div class="card">
      <h3>Savings opportunity finder</h3>
      <div class="card-sub">Estimated from this month's plan vs. national benchmarks.</div>
      <div class="ledger-line total"><span class="ll-label">Estimated savings available</span><span class="ll-value" style="color:var(--moss)">${money(savingsTotal)}/yr</span></div>
      ${insights.filter(i => i.potential_savings).map(i => `
        <div class="ledger-line"><span class="ll-label">${esc(i.title)}</span><span class="ll-value">${money(i.potential_savings)}</span></div>`).join("")}
    </div>

    <div class="grid-2">
      <div class="card">
        <h3>Document analysis</h3>
        <div class="card-sub">Upload a policy or mortgage statement for a quick read.</div>
        <input type="file" id="docUpload" accept=".pdf,.png,.jpg,.jpeg">
        <button class="btn small" style="margin-top:12px" onclick="mockAnalyzeDoc()">Analyze document</button>
        <div id="docResult" style="margin-top:14px"></div>
      </div>
      <div class="card">
        <h3>Home value tracking</h3>
        <div class="card-sub">Estimated trend, based on regional data (demo values).</div>
        <svg viewBox="0 0 260 90" width="100%" height="90">
          <polyline fill="none" stroke="var(--moss)" stroke-width="2.5"
            points="${trend.map((v, i) => `${i * 40},${88 - ((v - Math.min(...trend)) / (Math.max(...trend) - Math.min(...trend) || 1)) * 70}`).join(" ")}"/>
        </svg>
        <div class="ledger-line total"><span class="ll-label">Current estimate</span><span class="ll-value">${money(trend[trend.length - 1])}</span></div>
      </div>
    </div>

    <div class="card">
      <h3>Annual home financial report</h3>
      <div class="card-sub">A one-page summary you can save or print.</div>
      <button class="btn ghost small" onclick="window.print()">Generate & print report</button>
    </div>
  `);
}

window.mockAnalyzeDoc = function () {
  const el = document.getElementById("docResult");
  const f = document.getElementById("docUpload").files[0];
  el.innerHTML = `<div class="info-msg">${f ? `"${esc(f.name)}" scanned. ` : ""}Demo analysis: coverage looks standard for a home this size; consider confirming your dwelling coverage matches current rebuild costs given ${MARKET.insuranceYoYIncreasePct}% average rate increases this year.</div>`;
};

/* ---------------------------- SETTINGS ---------------------------- */
function renderSettings() {
  const plan = STATE.profile.plan;
  shell("settings", `
    <div class="app-header"><div><h1>Settings</h1><p>Your account and plan.</p></div></div>
    <div class="grid-2">
      <div class="card">
        <h3>Account</h3>
        <div class="ledger-line"><span class="ll-label">Email</span><span class="ll-value">${esc(STATE.email)}</span></div>
        <div class="ledger-line"><span class="ll-label">Current plan</span><span class="ll-value" style="text-transform:capitalize">${plan}</span></div>
        <a href="#/onboarding" class="btn ghost small block" style="margin-top:16px">Edit home profile</a>
      </div>
      <div class="card">
        <h3>Plan</h3>
        <p class="card-sub">Change or cancel any time.</p>
        <button class="btn small block" onclick="openUpgradeModal()">Manage plan</button>
        ${plan !== "free" ? `<button class="btn ghost small block" style="margin-top:10px" onclick="downgrade()">Downgrade to Free</button>` : ""}
      </div>
    </div>
  `);
}

window.downgrade = async function () {
  await DB.setPlan(STATE.email, "free");
  STATE.profile.plan = "free";
  route();
};

/* ---------------------------- UPGRADE MODAL ---------------------------- */
function openUpgradeModal() {
  const grid = document.getElementById("upgradePricingGrid");
  grid.innerHTML = `
    <div class="price-card">
      <div class="price-tear"></div>
      <div class="price-inner">
        <div class="price-tier">PLUS</div>
        <div class="price-amount">$9 <span>/ month</span></div>
        <ul class="price-list">
          <li>All 10 monthly action items</li>
          <li>Cost tracking & bill reminders</li>
          <li>Full maintenance schedule</li>
        </ul>
        <button class="btn block" onclick="upgradeTo('plus')">Choose Plus</button>
      </div>
    </div>
    <div class="price-card featured">
      <div class="price-tear"></div>
      <div class="price-inner">
        <div class="price-tier">PRO</div>
        <div class="price-amount">$19 <span>/ month</span></div>
        <ul class="price-list">
          <li>Everything in Plus</li>
          <li>Savings opportunity finder</li>
          <li>Document analysis</li>
          <li>Home value tracking + annual report</li>
        </ul>
        <button class="btn block" onclick="upgradeTo('pro')">Choose Pro</button>
      </div>
    </div>`;
  document.getElementById("upgradeModal").classList.add("open");
}
function closeUpgradeModal() { document.getElementById("upgradeModal").classList.remove("open"); }

window.upgradeTo = async function (plan) {
  /* DEMO: instantly grants the plan so you can preview every feature.
     In production, this button should call your backend to create a
     Stripe Checkout session (see supabase/functions/create-checkout)
     and only upgrade the plan after Stripe confirms payment via webhook. */
  await DB.setPlan(STATE.email, plan);
  STATE.profile.plan = plan;
  closeUpgradeModal();
  route();
};
window.openUpgradeModal = openUpgradeModal;
window.closeUpgradeModal = closeUpgradeModal;
window.logout = logout;
