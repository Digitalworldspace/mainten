/**
 * INSIGHT ENGINE
 * ------------------------------------------------------------------
 * Generates this month's action plan by comparing the homeowner's own
 * numbers against MARKET benchmarks (js/market-data.js) and against
 * their maintenance calendar. Always returns exactly 10 ranked items —
 * the paywall then decides how many the viewer is allowed to see.
 * ------------------------------------------------------------------
 */
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr + "T00:00:00");
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((d - now) / 86400000);
}

function money(n) {
  return "$" + Math.round(Number(n) || 0).toLocaleString("en-US");
}

function generateInsights(home, tasks) {
  const items = [];
  const insuranceAnnual = (home.insurance_monthly || 0) * 12;
  const insuranceDelta = insuranceAnnual - MARKET.avgHomeInsuranceAnnual;

  // 1. Insurance renewal timing
  const insDays = daysUntil(home.insurance_renewal_date);
  if (insDays !== null && insDays <= 45 && insDays >= 0) {
    items.push({
      title: `Home insurance renews in ${insDays} day${insDays === 1 ? "" : "s"}`,
      description: `Your policy is up for renewal soon. Get 2–3 comparison quotes now — the national average premium is ${money(MARKET.avgHomeInsuranceAnnual)}/yr (Insurify, 2026), up ${MARKET.insuranceYoYIncreasePct}% from last year.`,
      category: "insurance", priority: "high", potential_savings: insuranceDelta > 0 ? insuranceDelta : 150
    });
  }

  // 2. Insurance overpaying vs national average
  if (insuranceAnnual > MARKET.avgHomeInsuranceAnnual * 1.1) {
    items.push({
      title: "You may be overpaying for home insurance",
      description: `You're paying ${money(insuranceAnnual)}/yr — about ${money(insuranceDelta)} above the 2026 national average of ${money(MARKET.avgHomeInsuranceAnnual)}. Shopping around could close some of that gap.`,
      category: "insurance", priority: "high", potential_savings: insuranceDelta
    });
  }

  // 3. Property tax due date
  const taxDays = daysUntil(home.property_tax_due_date);
  if (taxDays !== null && taxDays <= 60 && taxDays >= 0) {
    items.push({
      title: `Property tax payment due in ${taxDays} days`,
      description: `Set aside ${money(home.property_tax_annual || MARKET.avgAnnualPropertyTax)} for your upcoming property tax installment so it doesn't hit your cash flow at once.`,
      category: "tax", priority: "high", potential_savings: null
    });
  }

  // 4. HVAC service reminder
  const hvacDays = home.last_hvac_service ? Math.round((new Date() - new Date(home.last_hvac_service)) / 86400000) : 999;
  if (hvacDays > 180) {
    items.push({
      title: "Book an HVAC tune-up",
      description: `It's been ${hvacDays > 900 ? "a while" : Math.floor(hvacDays / 30) + " months"} since your last service. A seasonal tune-up runs about ${money(MARKET.avgHVACServiceVisit)} (range ${money(MARKET.hvacServiceRangeLow)}–${money(MARKET.hvacServiceRangeHigh)}) and helps avoid a costlier breakdown.`,
      category: "maintenance", priority: "medium", potential_savings: null
    });
  }

  // 5. Gutter cleaning
  const gutterDays = home.last_gutter_cleaning ? Math.round((new Date() - new Date(home.last_gutter_cleaning)) / 86400000) : 999;
  if (gutterDays > 180) {
    items.push({
      title: "Clean the gutters before the next storm season",
      description: `Clogged gutters are a leading cause of foundation and roof water damage. Typical cost to have this done professionally is around ${money(MARKET.avgGutterCleaning)}.`,
      category: "maintenance", priority: "medium", potential_savings: null
    });
  }

  // 6. Maintenance reserve vs 1-3% rule
  const value = home.home_value || 0;
  const lowReserve = value * (MARKET.maintenanceRuleLowPct / 100);
  const highReserve = value * (MARKET.maintenanceRuleHighPct / 100);
  const age = home.year_built ? (new Date().getFullYear() - home.year_built) : null;
  const suggestedReserve = age && age > 30 ? highReserve : lowReserve;
  items.push({
    title: `Set aside ${money(suggestedReserve / 12)}/month for maintenance`,
    description: `Based on your home's value and ${age ? age + "-year" : "unknown"} age, a healthy reserve is ${money(lowReserve)}–${money(highReserve)}/yr (1–3% rule). Homeowners nationally spend an average of ${money(MARKET.avgAnnualMaintenanceBankrate)}/yr on upkeep (Bankrate, 2026).`,
    category: "budget", priority: "medium", potential_savings: null
  });

  // 7. Mortgage rate check
  items.push({
    title: "Review whether refinancing makes sense",
    description: `Freddie Mac's national average 30-year rate is ${MARKET.avgMortgageRate30yr}% as of early September 2026. If your current rate is meaningfully higher, it may be worth a conversation with your lender — even a small drop can be worth thousands over the loan term.`,
    category: "mortgage", priority: "low", potential_savings: null
  });

  // 8. Roof check
  items.push({
    title: "Do a visual roof and gutter-line inspection",
    description: `Minor roof upkeep (sealant, flashing checks, debris clearing) averages about ${money(MARKET.avgRoofMaintenanceAnnual)}/yr and is far cheaper than a surprise leak repair.`,
    category: "maintenance", priority: "low", potential_savings: null
  });

  // 9. Plumbing check
  items.push({
    title: "Inspect exposed plumbing and water heater",
    description: `Small leak fixes and drain care average ${money(MARKET.avgPlumbingMaintenanceAnnual)}/yr nationally. Catching a slow leak early can prevent thousands in water damage.`,
    category: "maintenance", priority: "low", potential_savings: null
  });

  // 10. Utilities benchmark
  const utilAnnual = (home.utilities_monthly || 0) * 12;
  items.push({
    title: utilAnnual > MARKET.avgAnnualUtilities
      ? "Your utility spend is above the national average"
      : "Your utility spend looks efficient",
    description: `You're spending about ${money(utilAnnual)}/yr on utilities vs. a national average of ${money(MARKET.avgAnnualUtilities)}/yr. ${utilAnnual > MARKET.avgAnnualUtilities ? "An energy audit or smart thermostat could help close the gap." : "Nice work — keep an eye on it as rates change."}`,
    category: "budget", priority: "low", potential_savings: utilAnnual > MARKET.avgAnnualUtilities ? utilAnnual - MARKET.avgAnnualUtilities : null
  });

  // Pending maintenance tasks become their own reminders
  (tasks || []).filter(t => t.status === "pending" && t.due_date).forEach(t => {
    const d = daysUntil(t.due_date);
    if (d !== null && d <= 30) {
      items.unshift({
        title: `${t.title} due ${d <= 0 ? "now" : "in " + d + " days"}`,
        description: `From your maintenance calendar — category: ${t.category}.`,
        category: "calendar", priority: d <= 7 ? "high" : "medium", potential_savings: null
      });
    }
  });

  // Rank: high > medium > low, cap to exactly 10, keep a stable order
  const rank = { high: 0, medium: 1, low: 2 };
  items.sort((a, b) => rank[a.priority] - rank[b.priority]);
  return items.slice(0, 10).map((it, i) => ({ ...it, sort_order: i, month: new Date().toISOString().slice(0, 7) + "-01" }));
}

function computeHomeHealthScore(home, tasks) {
  let score = 70;
  const insDays = daysUntil(home.insurance_renewal_date);
  if (insDays !== null && insDays < 0) score -= 15;
  const hvacDays = home.last_hvac_service ? Math.round((new Date() - new Date(home.last_hvac_service)) / 86400000) : 999;
  if (hvacDays > 365) score -= 10; else if (hvacDays < 200) score += 8;
  const gutterDays = home.last_gutter_cleaning ? Math.round((new Date() - new Date(home.last_gutter_cleaning)) / 86400000) : 999;
  if (gutterDays > 365) score -= 8; else if (gutterDays < 200) score += 5;
  const overdue = (tasks || []).filter(t => t.status === "pending" && daysUntil(t.due_date) !== null && daysUntil(t.due_date) < 0).length;
  score -= overdue * 6;
  const age = home.year_built ? new Date().getFullYear() - home.year_built : 15;
  if (age > 40) score -= 8; else if (age < 10) score += 7;
  return Math.max(10, Math.min(99, Math.round(score)));
}
