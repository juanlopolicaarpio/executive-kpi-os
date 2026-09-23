// Bridge between the backend KPI slugs and the app's KPI route ids.
export const SLUG_TO_APP_ID: Record<string, string> = {
  net_sales: 'kpi-1',
  market_share_overall: 'kpi-2',
  market_share_general_health: 'kpi-3',
  market_share_sleep_mood: 'kpi-4',
  market_share_womens_health: 'kpi-5',
  gross_margin: 'kpi-6',
  marketing_spend_pct_revenue: 'kpi-4b',
  trade_spend_pct_revenue: 'kpi-5b',
  conversion_rate: 'kpi-9',
  sessions: 'kpi-10',
  aov: 'kpi-11',
  store_health_score: 'kpi-12',
  oos_rate: 'kpi-13',
  affiliate_recruitment: 'kpi-15',
}

export const APP_ID_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.entries(SLUG_TO_APP_ID).map(([slug, id]) => [id, slug]),
)

/** Which dimensional metric carries this KPI's per-platform breakdown. */
export const SLUG_TO_DIMENSION: Record<string, string> = {
  net_sales: 'net_sales',
  sessions: 'sessions',
  conversion_rate: 'conversion_rate',
  aov: 'aov',
  market_share_general_health: 'market_share_general_health',
  market_share_sleep_mood: 'market_share_sleep_mood',
  market_share_womens_health: 'market_share_womens_health',
}

/** Market-share KPI -> the subcategory block in the fastmoss export. */
export const SLUG_TO_CATEGORY: Record<string, string> = {
  market_share_general_health: 'General Health',
  market_share_sleep_mood: 'Sleep & Mood',
  market_share_womens_health: "Women's Health",
}
