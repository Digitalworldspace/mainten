/**
 * MARKET BENCHMARKS
 * ------------------------------------------------------------------
 * Real, sourced national averages (USA) used to power comparisons and
 * recommendations. Update these numbers periodically — they will go
 * stale. Sources noted inline.
 * ------------------------------------------------------------------
 */
const MARKET = {
  // Insurify 2026 Insuring the American Homeowner Report (Mar 2026)
  avgHomeInsuranceAnnual: 3057,
  avgHomeInsuranceMonthly: 255,
  insuranceYoYIncreasePct: 4,

  // Freddie Mac PMMS, week of Sept 3, 2026
  avgMortgageRate30yr: 6.71,
  avgMortgageRate15yr: 6.04,

  // Bankrate "Hidden Costs of Homeownership" 2026 report
  avgAnnualPropertyTax: 4316,
  avgAnnualUtilities: 4494,
  avgAnnualMaintenanceBankrate: 8808,

  // Maintenance-budget rules of thumb (SuperMoney / PocketGuard, 2026)
  maintenanceRuleLowPct: 1,   // 1% of home value/yr — newer home, mild climate
  maintenanceRuleHighPct: 3,  // 3% of home value/yr — older home / harsh climate

  // HVAC service market rate (Liberty Home Guard / multiple 2026 guides)
  avgHVACServiceVisit: 150,
  hvacServiceRangeLow: 80,
  hvacServiceRangeHigh: 250,

  // Gutter cleaning, typical national range (HomeAdvisor-style guides)
  avgGutterCleaning: 175,

  // Roof / plumbing minor upkeep, annual (SuperMoney breakdown)
  avgRoofMaintenanceAnnual: 450,
  avgPlumbingMaintenanceAnnual: 250,

  sources: [
    { label: "Insurify — 2026 American Homeowner Report", url: "https://www.insurancejournal.com/news/national/2026/03/18/862372.htm" },
    { label: "Freddie Mac PMMS, Sept 3 2026", url: "https://tradingeconomics.com/united-states/30-year-mortgage-rate" },
    { label: "Bankrate — Hidden Costs of Homeownership 2026", url: "https://pearlscore.com/news/home-maintenance-cost-annual-report-2026" },
    { label: "Liberty Home Guard — HVAC Maintenance Costs 2026", url: "https://www.libertyhomeguard.com/blog/home-maintenance/hvac-maintenance-cost/" }
  ]
};
