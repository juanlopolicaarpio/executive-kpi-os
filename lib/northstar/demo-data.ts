import type { TargetDirection } from '@/lib/kpi/status'
import type { UserRole } from '@/types/user'

export const NORTHSTAR_ORG = 'Northstar'
export const NORTHSTAR_AS_OF = '2026-08-23'
export const NORTHSTAR_MONTHS = ['2026-06', '2026-07', '2026-08']

type Unit = 'currency' | 'percentage' | 'number' | 'ratio'
type Status = 'on-track' | 'at-risk' | 'off-track' | 'no-data'
type Trend = 'up' | 'down' | 'flat'
type Category = 'business-performance' | 'profitability' | 'growth-engine' | 'operations'

export type DemoKpi = {
  slug: string
  appId: string
  name: string
  backendCategory: string
  category: Category
  description: string
  formula: string
  unit: Unit
  rhythm: 'daily' | 'weekly' | 'monthly' | 'quarterly'
  ownerId: string
  ownerName: string
  ownerRole: string
  targetNumeric: number
  targetDisplay: string
  targetDirection: TargetDirection
  currentValue: number
  currentValueDisplay: string
  attainmentPct: number
  status: Status
  deviationPct: number | null
  trend: Trend
  history: { date: string; value: number; target: number }[]
  priority: 'critical' | 'high' | 'medium' | 'low'
  weight: number
  whyItsCore: string
}

export type NorthstarPerson = {
  memberId: string
  userId: string
  name: string
  email: string
  dbRole: string
  role: UserRole
  roleLabel: string
  ownedKpiIds: string[]
}

export const northstarPeople: NorthstarPerson[] = [
  {
    memberId: 'ns-ceo',
    userId: 'user-ceo',
    name: 'Avery Morgan',
    email: 'avery.morgan@northstar.example',
    dbRole: 'ceo',
    role: 'ceo',
    roleLabel: 'CEO',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-cfo',
    userId: 'user-finance',
    name: 'Jordan Lee',
    email: 'jordan.lee@northstar.example',
    dbRole: 'finance',
    role: 'finance',
    roleLabel: 'CFO',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-growth',
    userId: 'user-manager',
    name: 'Casey Brooks',
    email: 'casey.brooks@northstar.example',
    dbRole: 'growth_lead',
    role: 'econs-manager',
    roleLabel: 'Head of Growth',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-paid',
    userId: 'user-econs-officer',
    name: 'Morgan Patel',
    email: 'morgan.patel@northstar.example',
    dbRole: 'paid_acquisition',
    role: 'econs-officer',
    roleLabel: 'Paid Acquisition Lead',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-crm',
    userId: 'user-category',
    name: 'Riley Chen',
    email: 'riley.chen@northstar.example',
    dbRole: 'crm_lifecycle',
    role: 'category-lead',
    roleLabel: 'CRM & Lifecycle Lead',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-partners',
    userId: 'user-shopee-lazada',
    name: 'Taylor Kim',
    email: 'taylor.kim@northstar.example',
    dbRole: 'partnerships',
    role: 'shopee-lazada-ops',
    roleLabel: 'Commercial Partnerships Lead',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-affiliate',
    userId: 'user-affiliate',
    name: 'Quinn Davis',
    email: 'quinn.davis@northstar.example',
    dbRole: 'affiliate_marketing',
    role: 'affiliate-officer',
    roleLabel: 'Affiliate Marketing Lead',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-telesales',
    userId: 'user-telesales',
    name: 'Cameron Reed',
    email: 'cameron.reed@northstar.example',
    dbRole: 'telesales',
    role: 'tts-ops',
    roleLabel: 'Telesales Lead',
    ownedKpiIds: [],
  },
  {
    memberId: 'ns-intel',
    userId: 'user-tts',
    name: 'Skyler James',
    email: 'skyler.james@northstar.example',
    dbRole: 'customer_intelligence',
    role: 'brand',
    roleLabel: 'Customer Intelligence Lead',
    ownedKpiIds: [],
  },
]

export type NorthstarAlert = {
  id: string
  alertDate: string
  severity: 'Critical' | 'High' | 'Medium' | 'Positive'
  section: string
  kpi: string
  insight: string
  recommendedAction: string
  status: 'Open' | 'Monitoring' | 'Opportunity'
}

export const northstarAlerts: NorthstarAlert[] = [
  {
    id: 'alert-2026-08-04-revenue-forecast',
    alertDate: '2026-08-04',
    severity: 'Critical',
    section: 'Executive Forecast',
    kpi: 'Revenue',
    insight: 'Revenue forecast moved below plan after traffic softened at the start of August.',
    recommendedAction: 'Review paid traffic recovery plan and prioritize highest-converting channels.',
    status: 'Open',
  },
  {
    id: 'alert-2026-08-05-traffic',
    alertDate: '2026-08-05',
    severity: 'High',
    section: 'Executive Funnel',
    kpi: 'Website Visits',
    insight: 'Website visits are materially below the recent run rate, reducing eligible lead volume.',
    recommendedAction: 'Inspect traffic-source mix and paid campaign pacing.',
    status: 'Open',
  },
  {
    id: 'alert-2026-08-07-approval',
    alertDate: '2026-08-07',
    severity: 'High',
    section: 'Partner Health',
    kpi: 'Approval Rate',
    insight: 'Approval rates declined for selected bank partners, putting pressure on approved applications.',
    recommendedAction: 'Confirm whether underwriting or eligibility rules changed with affected partners.',
    status: 'Open',
  },
  {
    id: 'alert-2026-08-11-cpa',
    alertDate: '2026-08-11',
    severity: 'Medium',
    section: 'Paid Acquisition',
    kpi: 'CPA',
    insight: 'Lower approval rates increased effective acquisition cost.',
    recommendedAction: 'Shift incremental budget toward campaigns with stronger approval quality.',
    status: 'Monitoring',
  },
  {
    id: 'alert-2026-08-14-cross-sell',
    alertDate: '2026-08-14',
    severity: 'Positive',
    section: 'Customer Lifecycle',
    kpi: 'Cross-Sell Rate',
    insight: 'Cross-sell and repeat product adoption continue to improve versus June.',
    recommendedAction: 'Scale high-performing lifecycle journeys and document winning triggers.',
    status: 'Opportunity',
  },
  {
    id: 'alert-2026-08-17-broadband',
    alertDate: '2026-08-17',
    severity: 'Positive',
    section: 'Vertical Expansion',
    kpi: 'Broadband',
    insight: 'Broadband contribution is growing faster than the core portfolio.',
    recommendedAction: 'Evaluate additional broadband campaigns and adjacent self-employed customer segments.',
    status: 'Opportunity',
  },
  {
    id: 'alert-2026-08-20-recovery',
    alertDate: '2026-08-20',
    severity: 'Positive',
    section: 'Executive Funnel',
    kpi: 'Website Visits',
    insight: 'Traffic and approval rates are recovering after the early-August decline.',
    recommendedAction: 'Maintain recovery initiatives and monitor conversion quality.',
    status: 'Monitoring',
  },
]

export const revenueMix = [
  { weekStart: '2026-08-17', dimension: 'Product', category: 'Credit Card', revenue: 1307606, grossProfit: 592447, mixPct: 41.6 },
  { weekStart: '2026-08-17', dimension: 'Product', category: 'Personal Loan', revenue: 720037, grossProfit: 326233, mixPct: 23.0 },
  { weekStart: '2026-08-17', dimension: 'Product', category: 'Car Insurance', revenue: 404108, grossProfit: 183092, mixPct: 13.0 },
  { weekStart: '2026-08-17', dimension: 'Product', category: 'Digital Bank', revenue: 330084, grossProfit: 149554, mixPct: 11.0 },
  { weekStart: '2026-08-17', dimension: 'Product', category: 'Broadband', revenue: 353498, grossProfit: 160162, mixPct: 11.4 },
  { weekStart: '2026-08-17', dimension: 'Acquisition Channel', category: 'Paid Search', revenue: 961501, grossProfit: 435634, mixPct: 32.0 },
  { weekStart: '2026-08-17', dimension: 'Acquisition Channel', category: 'Paid Social', revenue: 733334, grossProfit: 332257, mixPct: 24.0 },
  { weekStart: '2026-08-17', dimension: 'Acquisition Channel', category: 'Affiliate', revenue: 660323, grossProfit: 299178, mixPct: 21.0 },
  { weekStart: '2026-08-17', dimension: 'Partner', category: 'Pioneer Bank', revenue: 805810, grossProfit: 365094, mixPct: 26.0 },
  { weekStart: '2026-08-17', dimension: 'Partner', category: 'Orbit Wallet', revenue: 590753, grossProfit: 267657, mixPct: 19.0 },
  { weekStart: '2026-08-17', dimension: 'Customer Type', category: 'New Customers', revenue: 2105674, grossProfit: 954034, mixPct: 68.0 },
  { weekStart: '2026-08-17', dimension: 'Customer Type', category: 'Returning Customers', revenue: 986033, grossProfit: 446750, mixPct: 32.0 },
]

export type AffiliateMarketingRow = {
  weekStart: string
  affiliateId: string
  affiliateName: string
  affiliateType: 'Influencer' | 'Affiliate'
  product: string
  active: boolean
  contentPublished: number
  reach: number
  engagements: number
  engagementRate: number
  clicks: number
  conversions: number
  approvedConversions: number
  approvalRate: number
  conversionRate: number
  cost: number
  cpa: number
  revenue: number
  grossProfit: number
  roi: number
}

export const affiliateMarketing: AffiliateMarketingRow[] = [
  { weekStart: '2026-08-17', affiliateId: 'FIN001', affiliateName: 'Everyday Finance Lab', affiliateType: 'Influencer', product: 'Credit Card', active: true, contentPublished: 2, reach: 116377, engagements: 4983, engagementRate: 4.28, clicks: 956, conversions: 60, approvedConversions: 24, approvalRate: 40.93, conversionRate: 6.32, cost: 110955.95, cpa: 4623.16, revenue: 49983.77, grossProfit: 27685.13, roi: -0.75 },
  { weekStart: '2026-08-17', affiliateId: 'FIN002', affiliateName: 'Budget Buddy', affiliateType: 'Influencer', product: 'Personal Loan', active: true, contentPublished: 7, reach: 406398, engagements: 10271, engagementRate: 2.53, clicks: 1453, conversions: 40, approvedConversions: 14, approvalRate: 37.48, conversionRate: 2.77, cost: 75848.06, cpa: 5417.72, revenue: 42561.69, grossProfit: 18089.97, roi: -0.76 },
  { weekStart: '2026-08-17', affiliateId: 'FIN003', affiliateName: 'Practical Ledger', affiliateType: 'Influencer', product: 'Credit Card', active: true, contentPublished: 2, reach: 278637, engagements: 7041, engagementRate: 2.53, clicks: 1540, conversions: 53, approvedConversions: 16, approvalRate: 30.89, conversionRate: 3.46, cost: 106943.89, cpa: 6683.99, revenue: 32456.46, grossProfit: 17703.78, roi: -0.83 },
  { weekStart: '2026-08-17', affiliateId: 'FIN004', affiliateName: 'Smart Budget Studio', affiliateType: 'Influencer', product: 'Digital Bank', active: true, contentPublished: 4, reach: 330475, engagements: 17287, engagementRate: 5.23, clicks: 3486, conversions: 95, approvedConversions: 44, approvalRate: 46.83, conversionRate: 3.66, cost: 115845.64, cpa: 2632.86, revenue: 56664.08, grossProfit: 29963.06, roi: -0.74 },
  { weekStart: '2026-08-17', affiliateId: 'FIN005', affiliateName: 'Global Worker Hub', affiliateType: 'Influencer', product: 'Personal Loan', active: false, contentPublished: 0, reach: 0, engagements: 0, engagementRate: 0, clicks: 0, conversions: 0, approvedConversions: 0, approvalRate: 51.85, conversionRate: 5.94, cost: 15032.91, cpa: 15032.91, revenue: 0, grossProfit: 0, roi: -1 },
  { weekStart: '2026-08-17', affiliateId: 'FIN006', affiliateName: 'Thrifty Living', affiliateType: 'Influencer', product: 'Credit Card', active: true, contentPublished: 7, reach: 226728, engagements: 9426, engagementRate: 4.16, clicks: 2796, conversions: 106, approvedConversions: 53, approvalRate: 50.64, conversionRate: 3.8, cost: 121147.99, cpa: 2285.81, revenue: 106827.08, grossProfit: 45004.44, roi: -0.63 },
  { weekStart: '2026-08-17', affiliateId: 'AFF007', affiliateName: 'QuickRide Network', affiliateType: 'Affiliate', product: 'Credit Card', active: true, contentPublished: 3, reach: 239158, engagements: 14735, engagementRate: 6.16, clicks: 3548, conversions: 101, approvedConversions: 37, approvalRate: 36.79, conversionRate: 2.85, cost: 90634.31, cpa: 2449.58, revenue: 73873.25, grossProfit: 39004.99, roi: -0.57 },
  { weekStart: '2026-08-17', affiliateId: 'AFF008', affiliateName: 'MealDash Network', affiliateType: 'Affiliate', product: 'Digital Bank', active: true, contentPublished: 5, reach: 331477, engagements: 7371, engagementRate: 2.22, clicks: 1871, conversions: 84, approvedConversions: 34, approvalRate: 40.61, conversionRate: 4.52, cost: 94714.78, cpa: 2785.73, revenue: 43925.91, grossProfit: 19778.98, roi: -0.79 },
  { weekStart: '2026-08-17', affiliateId: 'AFF009', affiliateName: 'Finance Blog Network', affiliateType: 'Affiliate', product: 'Credit Card', active: true, contentPublished: 2, reach: 311333, engagements: 10737, engagementRate: 3.45, clicks: 2713, conversions: 175, approvedConversions: 62, approvalRate: 35.72, conversionRate: 6.48, cost: 199896.98, cpa: 3224.14, revenue: 129714.91, grossProfit: 71181.94, roi: -0.64 },
  { weekStart: '2026-08-17', affiliateId: 'AFF010', affiliateName: 'Roadwise Network', affiliateType: 'Affiliate', product: 'Car Insurance', active: true, contentPublished: 7, reach: 329620, engagements: 10717, engagementRate: 3.25, clicks: 2673, conversions: 103, approvedConversions: 40, approvalRate: 39.63, conversionRate: 3.88, cost: 109348.69, cpa: 2733.72, revenue: 95961.07, grossProfit: 45704.28, roi: -0.58 },
]

export const affiliateTrend = [
  { weekStart: '2026-06-01', revenue: 621312, grossProfit: 325744, cost: 1169234, approvedConversions: 347, cpa: 3369, roi: -0.72 },
  { weekStart: '2026-06-15', revenue: 1131198, grossProfit: 575273, cost: 1336125, approvedConversions: 505, cpa: 2646, roi: -0.57 },
  { weekStart: '2026-06-29', revenue: 904097, grossProfit: 452034, cost: 1414919, approvedConversions: 442, cpa: 3201, roi: -0.68 },
  { weekStart: '2026-07-13', revenue: 1464213, grossProfit: 699838, cost: 1562828, approvedConversions: 594, cpa: 2631, roi: -0.55 },
  { weekStart: '2026-07-27', revenue: 1350227, grossProfit: 650212, cost: 1712082, approvedConversions: 534, cpa: 3206, roi: -0.62 },
  { weekStart: '2026-08-03', revenue: 859574, grossProfit: 431624, cost: 1214694, approvedConversions: 359, cpa: 3384, roi: -0.64 },
  { weekStart: '2026-08-10', revenue: 967162, grossProfit: 475749, cost: 1235161, approvedConversions: 492, cpa: 2510, roi: -0.61 },
  { weekStart: '2026-08-17', revenue: 631969, grossProfit: 314117, cost: 1040369, approvedConversions: 324, cpa: 3211, roi: -0.7 },
]

export type TelesalesRow = {
  date: string
  agentId: string
  agentName: string
  team: string
  active: boolean
  hoursLogged: number
  callsMade: number
  contactsMade: number
  contactRate: number
  applicationsStarted: number
  applicationsSubmitted: number
  approvedApplications: number
  lenderApprovalRate: number
  revenueConversions: number
  revenue: number
  grossProfit: number
  revenuePerHour: number
  productivityScore: number
}

export const telesalesDaily: TelesalesRow[] = [
  { date: '2026-08-23', agentId: 'TS001', agentName: 'Agent 01', team: 'Team Alpha', active: true, hoursLogged: 2.9, callsMade: 42, contactsMade: 17, contactRate: 40.48, applicationsStarted: 8, applicationsSubmitted: 5, approvedApplications: 4, lenderApprovalRate: 41.54, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.58 },
  { date: '2026-08-23', agentId: 'TS002', agentName: 'Agent 02', team: 'Team Bravo', active: true, hoursLogged: 3.0, callsMade: 42, contactsMade: 20, contactRate: 47.62, applicationsStarted: 9, applicationsSubmitted: 5, approvedApplications: 4, lenderApprovalRate: 39.74, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 32.89 },
  { date: '2026-08-23', agentId: 'TS003', agentName: 'Agent 03', team: 'Team Charlie', active: true, hoursLogged: 2.9, callsMade: 37, contactsMade: 16, contactRate: 43.24, applicationsStarted: 7, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 41.8, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 32.59 },
  { date: '2026-08-23', agentId: 'TS004', agentName: 'Agent 04', team: 'Team Delta', active: true, hoursLogged: 2.5, callsMade: 37, contactsMade: 13, contactRate: 35.14, applicationsStarted: 6, applicationsSubmitted: 3, approvedApplications: 2, lenderApprovalRate: 31.31, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 25.23 },
  { date: '2026-08-23', agentId: 'TS005', agentName: 'Agent 05', team: 'Team Alpha', active: true, hoursLogged: 2.7, callsMade: 36, contactsMade: 17, contactRate: 47.22, applicationsStarted: 8, applicationsSubmitted: 5, approvedApplications: 4, lenderApprovalRate: 32.39, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 30.0 },
  { date: '2026-08-23', agentId: 'TS006', agentName: 'Agent 06', team: 'Team Bravo', active: true, hoursLogged: 2.7, callsMade: 29, contactsMade: 12, contactRate: 41.38, applicationsStarted: 6, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 41.84, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.15 },
  { date: '2026-08-23', agentId: 'TS007', agentName: 'Agent 07', team: 'Team Charlie', active: true, hoursLogged: 2.8, callsMade: 45, contactsMade: 17, contactRate: 37.78, applicationsStarted: 9, applicationsSubmitted: 6, approvedApplications: 5, lenderApprovalRate: 34.75, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 30.25 },
  { date: '2026-08-23', agentId: 'TS008', agentName: 'Agent 08', team: 'Team Delta', active: true, hoursLogged: 2.7, callsMade: 37, contactsMade: 17, contactRate: 45.95, applicationsStarted: 8, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 38.95, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.28 },
  { date: '2026-08-23', agentId: 'TS009', agentName: 'Agent 09', team: 'Team Alpha', active: true, hoursLogged: 2.8, callsMade: 53, contactsMade: 20, contactRate: 37.74, applicationsStarted: 8, applicationsSubmitted: 5, approvedApplications: 4, lenderApprovalRate: 38.73, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 30.01 },
  { date: '2026-08-23', agentId: 'TS010', agentName: 'Agent 10', team: 'Team Bravo', active: true, hoursLogged: 2.8, callsMade: 48, contactsMade: 19, contactRate: 39.58, applicationsStarted: 8, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 32.52, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.94 },
  { date: '2026-08-23', agentId: 'TS011', agentName: 'Agent 11', team: 'Team Charlie', active: true, hoursLogged: 2.7, callsMade: 34, contactsMade: 13, contactRate: 38.24, applicationsStarted: 7, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 38.31, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 27.84 },
  { date: '2026-08-23', agentId: 'TS012', agentName: 'Agent 12', team: 'Team Delta', active: true, hoursLogged: 3.0, callsMade: 33, contactsMade: 12, contactRate: 36.36, applicationsStarted: 6, applicationsSubmitted: 3, approvedApplications: 2, lenderApprovalRate: 37.84, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.96 },
  { date: '2026-08-23', agentId: 'TS013', agentName: 'Agent 13', team: 'Team Alpha', active: true, hoursLogged: 2.8, callsMade: 47, contactsMade: 18, contactRate: 38.3, applicationsStarted: 10, applicationsSubmitted: 5, approvedApplications: 4, lenderApprovalRate: 36.2, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.13 },
  { date: '2026-08-23', agentId: 'TS014', agentName: 'Agent 14', team: 'Team Bravo', active: true, hoursLogged: 2.9, callsMade: 35, contactsMade: 14, contactRate: 40.0, applicationsStarted: 7, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 34.39, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.92 },
  { date: '2026-08-23', agentId: 'TS015', agentName: 'Agent 15', team: 'Team Charlie', active: true, hoursLogged: 2.6, callsMade: 40, contactsMade: 17, contactRate: 42.5, applicationsStarted: 9, applicationsSubmitted: 5, approvedApplications: 4, lenderApprovalRate: 38.29, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 28.33 },
  { date: '2026-08-23', agentId: 'TS016', agentName: 'Agent 16', team: 'Team Delta', active: true, hoursLogged: 2.7, callsMade: 37, contactsMade: 15, contactRate: 40.54, applicationsStarted: 8, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 36.64, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 28.44 },
  { date: '2026-08-23', agentId: 'TS017', agentName: 'Agent 17', team: 'Team Alpha', active: true, hoursLogged: 2.8, callsMade: 39, contactsMade: 16, contactRate: 41.03, applicationsStarted: 8, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 38.53, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 30.26 },
  { date: '2026-08-23', agentId: 'TS018', agentName: 'Agent 18', team: 'Team Bravo', active: true, hoursLogged: 2.9, callsMade: 42, contactsMade: 17, contactRate: 40.48, applicationsStarted: 8, applicationsSubmitted: 5, approvedApplications: 4, lenderApprovalRate: 36.34, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 31.58 },
  { date: '2026-08-23', agentId: 'TS019', agentName: 'Agent 19', team: 'Team Charlie', active: true, hoursLogged: 2.6, callsMade: 47, contactsMade: 19, contactRate: 40.43, applicationsStarted: 8, applicationsSubmitted: 4, approvedApplications: 3, lenderApprovalRate: 35.87, revenueConversions: 0, revenue: 0, grossProfit: 0, revenuePerHour: 0, productivityScore: 29.35 },
  { date: '2026-08-23', agentId: 'TS020', agentName: 'Agent 20', team: 'Team Delta', active: true, hoursLogged: 2.8, callsMade: 55, contactsMade: 26, contactRate: 47.27, applicationsStarted: 13, applicationsSubmitted: 8, approvedApplications: 6, lenderApprovalRate: 38.61, revenueConversions: 1, revenue: 2582.67, grossProfit: 1312.91, revenuePerHour: 357, productivityScore: 31.14 },
]

export const telesalesTrend = [
  { date: '2026-08-01', activeAgents: 15, calls: 1251, contacts: 514, contactRate: 41.1, applicationsSubmitted: 157, approvedApplications: 128, revenue: 40362, grossProfit: 19475 },
  { date: '2026-08-03', activeAgents: 20, calls: 2286, contacts: 966, contactRate: 42.3, applicationsSubmitted: 277, approvedApplications: 222, revenue: 117620, grossProfit: 56339 },
  { date: '2026-08-07', activeAgents: 17, calls: 1935, contacts: 804, contactRate: 41.6, applicationsSubmitted: 239, approvedApplications: 196, revenue: 105622, grossProfit: 50672 },
  { date: '2026-08-14', activeAgents: 17, calls: 1977, contacts: 845, contactRate: 42.7, applicationsSubmitted: 251, approvedApplications: 205, revenue: 102244, grossProfit: 49061 },
  { date: '2026-08-20', activeAgents: 19, calls: 2364, contacts: 1012, contactRate: 42.8, applicationsSubmitted: 320, approvedApplications: 264, revenue: 136965, grossProfit: 65952 },
  { date: '2026-08-23', activeAgents: 20, calls: 815, contacts: 337, contactRate: 41.3, applicationsSubmitted: 91, approvedApplications: 70, revenue: 2583, grossProfit: 1313 },
]

export const partnerHealth = [
  { partner: 'Pioneer Bank', type: 'Bank', revenue: 835889, grossProfit: 375812, cpa: 1199, approvalRate: 38.0, slaRate: 95.2, growth: 22.6 },
  { partner: 'Orbit Wallet', type: 'Digital Bank', revenue: 572782, grossProfit: 255971, cpa: 1074, approvalRate: 46.0, slaRate: 96.5, growth: 19.0 },
  { partner: 'BPI', type: 'Bank', revenue: 490525, grossProfit: 217371, cpa: 1204, approvalRate: 35.0, slaRate: 90.5, growth: 14.1 },
  { partner: 'Insurance Partners', type: 'Insurance', revenue: 422148, grossProfit: 184677, cpa: 899, approvalRate: 52.0, slaRate: 94.2, growth: 18.4 },
  { partner: 'Digital Bank Partners', type: 'Digital Bank', revenue: 390889, grossProfit: 172326, cpa: 970, approvalRate: 48.0, slaRate: 96.4, growth: 11.6 },
  { partner: 'Broadband Partner', type: 'Broadband', revenue: 466198, grossProfit: 208499, cpa: 751, approvalRate: 61.0, slaRate: 98.0, growth: 20.1 },
]

export const verticalExpansion = [
  { vertical: 'Core Financial Products', active: true, revenue: 1877901, grossProfit: 858134, newPartnersSigned: 0, pipelineOpportunities: 0, pipelineValue: 0 },
  { vertical: 'Insurance Expansion', active: true, revenue: 450587, grossProfit: 206475, newPartnersSigned: 0, pipelineOpportunities: 0, pipelineValue: 0 },
  { vertical: 'Digital Banks', active: true, revenue: 398197, grossProfit: 181120, newPartnersSigned: 0, pipelineOpportunities: 0, pipelineValue: 0 },
  { vertical: 'Broadband', active: true, revenue: 292347, grossProfit: 137232, newPartnersSigned: 0, pipelineOpportunities: 0, pipelineValue: 0 },
  { vertical: 'Future Verticals Pipeline', active: false, revenue: 0, grossProfit: 0, newPartnersSigned: 0, pipelineOpportunities: 7, pipelineValue: 15150000 },
]

const executiveDaily = [
  { date: '2026-06-30', revenue: 463616, target: 2262230, gp: 221094, gpTarget: 1063248, margin: 47.7, forecast: 13028850, gpForecast: 6163826, variance: -78.6, visits: 19052, leads: 808, apps: 508, approvals: 194, approvalRate: 38.2, visitApproval: 1.0, newVerticalRevenue: 16227, activeUsers: 430615, returningUsers: 128344, crossSell: 7.8, repeat: 12.0, rpu: 19, ltv: 2369 },
  { date: '2026-07-31', revenue: 396980, target: 2382200, gp: 182794, gpTarget: 1119634, margin: 46.0, forecast: 11753125, gpForecast: 5525717, variance: -82.4, visits: 21826, leads: 846, apps: 495, approvals: 175, approvalRate: 35.4, visitApproval: 0.8, newVerticalRevenue: 31758, activeUsers: 447656, returningUsers: 139668, crossSell: 9.5, repeat: 14.2, rpu: 20, ltv: 2489 },
  { date: '2026-08-03', revenue: 292554, target: 2393810, gp: 134160, gpTarget: 1125091, margin: 45.9, forecast: 8823593, gpForecast: 4051636, variance: -87.0, visits: 18218, leads: 718, apps: 420, approvals: 133, approvalRate: 31.7, visitApproval: 0.7, newVerticalRevenue: 31376, activeUsers: 449035, returningUsers: 140705, crossSell: 9.7, repeat: 14.4, rpu: 20, ltv: 2503 },
  { date: '2026-08-07', revenue: 318451, target: 2409290, gp: 145339, gpTarget: 1132366, margin: 45.6, forecast: 9087792, gpForecast: 4162246, variance: -86.6, visits: 19214, leads: 776, apps: 455, approvals: 143, approvalRate: 31.4, visitApproval: 0.7, newVerticalRevenue: 35109, activeUsers: 450968, returningUsers: 142122, crossSell: 9.9, repeat: 14.7, rpu: 21, ltv: 2525 },
  { date: '2026-08-14', revenue: 433752, target: 2436380, gp: 196822, gpTarget: 1145099, margin: 45.4, forecast: 9905004, gpForecast: 4518240, variance: -85.4, visits: 22111, leads: 935, apps: 557, approvals: 193, approvalRate: 34.6, visitApproval: 0.9, newVerticalRevenue: 50098, activeUsers: 454772, returningUsers: 144753, crossSell: 10.3, repeat: 15.2, rpu: 21, ltv: 2569 },
  { date: '2026-08-20', revenue: 491208, target: 2459600, gp: 222518, gpTarget: 1156012, margin: 45.3, forecast: 10869255, gpForecast: 4946324, variance: -83.9, visits: 23211, leads: 1009, apps: 612, approvals: 221, approvalRate: 36.1, visitApproval: 1.0, newVerticalRevenue: 58945, activeUsers: 458614, returningUsers: 147215, crossSell: 10.6, repeat: 15.6, rpu: 21, ltv: 2612 },
  { date: '2026-08-23', revenue: 340013, target: 1747088, gp: 154085, gpTarget: 821131, margin: 45.3, forecast: 11070740, gpForecast: 5034781, variance: -83.6, visits: 15609, leads: 684, apps: 418, approvals: 152, approvalRate: 36.4, visitApproval: 1.0, newVerticalRevenue: 40802, activeUsers: 460770, returningUsers: 148529, crossSell: 10.8, repeat: 15.8, rpu: 22, ltv: 2634 },
]

const acquisition = [
  { date: '2026-06-30', cpa: 1090, cpl: 178, roas: 1.90 },
  { date: '2026-07-31', cpa: 1135, cpl: 176, roas: 1.86 },
  { date: '2026-08-07', cpa: 1349, cpl: 217, roas: 1.66 },
  { date: '2026-08-14', cpa: 1051, cpl: 188, roas: 1.88 },
  { date: '2026-08-23', cpa: 1099, cpl: 195, roas: 1.91 },
]

const sum = <T>(rows: T[], pick: (row: T) => number) => rows.reduce((total, row) => total + pick(row), 0)

export function getAffiliateSummary() {
  const activeRows = affiliateMarketing.filter((row) => row.active)
  const latestTrend = affiliateTrend.at(-1)!
  const previousTrend = affiliateTrend.at(-2)!
  const topByRevenue = [...activeRows].sort((a, b) => b.revenue - a.revenue)[0]!
  const topByApprovals = [...activeRows].sort((a, b) => b.approvedConversions - a.approvedConversions)[0]!
  const weakestEconomics = [...activeRows].sort((a, b) => b.cpa - a.cpa)[0]!
  const bestCpa = [...activeRows].sort((a, b) => a.cpa - b.cpa)[0]!
  const revenueChangePct = previousTrend.revenue === 0 ? 0 : ((latestTrend.revenue - previousTrend.revenue) / previousTrend.revenue) * 100

  return {
    asOf: latestTrend.weekStart,
    activeAffiliates: activeRows.length,
    inactiveAffiliates: affiliateMarketing.length - activeRows.length,
    contentPublished: sum(activeRows, (row) => row.contentPublished),
    reach: sum(activeRows, (row) => row.reach),
    clicks: sum(activeRows, (row) => row.clicks),
    conversions: sum(activeRows, (row) => row.conversions),
    approvedConversions: latestTrend.approvedConversions,
    revenue: latestTrend.revenue,
    grossProfit: latestTrend.grossProfit,
    cost: latestTrend.cost,
    cpa: latestTrend.cpa,
    roi: latestTrend.roi,
    revenueChangePct,
    topByRevenue,
    topByApprovals,
    weakestEconomics,
    bestCpa,
  }
}

export function getTelesalesSummary() {
  const activeRows = telesalesDaily.filter((row) => row.active)
  const latestTrend = telesalesTrend.at(-1)!
  const previousFullDay = telesalesTrend.at(-2)!
  const topByApprovals = [...activeRows].sort((a, b) => b.approvedApplications - a.approvedApplications)[0]!
  const topByContactRate = [...activeRows].sort((a, b) => b.contactRate - a.contactRate)[0]!
  const topByRevenue = [...activeRows].sort((a, b) => b.revenue - a.revenue)[0]!
  const teamMap = new Map<string, { team: string; agents: number; calls: number; contacts: number; submitted: number; approved: number; revenue: number }>()

  for (const row of activeRows) {
    const current = teamMap.get(row.team) ?? { team: row.team, agents: 0, calls: 0, contacts: 0, submitted: 0, approved: 0, revenue: 0 }
    current.agents += 1
    current.calls += row.callsMade
    current.contacts += row.contactsMade
    current.submitted += row.applicationsSubmitted
    current.approved += row.approvedApplications
    current.revenue += row.revenue
    teamMap.set(row.team, current)
  }

  const teamSummary = Array.from(teamMap.values()).map((team) => ({
    ...team,
    contactRate: team.calls === 0 ? 0 : (team.contacts / team.calls) * 100,
  }))

  return {
    asOf: latestTrend.date,
    activeAgents: latestTrend.activeAgents,
    calls: latestTrend.calls,
    contacts: latestTrend.contacts,
    contactRate: latestTrend.contactRate,
    applicationsSubmitted: latestTrend.applicationsSubmitted,
    approvedApplications: latestTrend.approvedApplications,
    revenue: latestTrend.revenue,
    grossProfit: latestTrend.grossProfit,
    previousFullDay,
    topByApprovals,
    topByContactRate,
    topByRevenue,
    teamSummary,
  }
}

function fmt(v: number, unit: Unit) {
  if (unit === 'currency') return v >= 1_000_000 ? `PHP ${(v / 1_000_000).toFixed(1)}M` : v >= 1000 ? `PHP ${(v / 1000).toFixed(0)}K` : `PHP ${Math.round(v)}`
  if (unit === 'percentage') return `${v.toFixed(1)}%`
  if (unit === 'ratio') return `${v.toFixed(2)}x`
  return v >= 1_000_000 ? `${(v / 1_000_000).toFixed(2)}M` : v >= 1000 ? `${(v / 1000).toFixed(0)}K` : `${Math.round(v)}`
}

function status(value: number, target: number, direction: TargetDirection): Status {
  const ratio = direction === 'below' ? target / value : value / target
  if (ratio >= 1) return 'on-track'
  if (ratio >= 0.9) return 'at-risk'
  return 'off-track'
}

function deviation(value: number, target: number, direction: TargetDirection) {
  if (target === 0) return null
  return direction === 'below'
    ? ((target - value) / Math.abs(target)) * 100
    : ((value - target) / Math.abs(target)) * 100
}

function attainment(value: number, target: number, direction: TargetDirection) {
  if (target === 0 || value === 0) return 0
  const ratio = direction === 'below' ? target / value : value / target
  return Math.round(ratio * 100)
}

function trend(values: { value: number }[], direction: TargetDirection): Trend {
  const last = values.at(-1)
  const prev = values.at(-2)
  if (!last || !prev || prev.value === 0) return 'flat'
  const raw = (last.value - prev.value) / Math.abs(prev.value)
  const improving = direction === 'below' ? raw < -0.01 : raw > 0.01
  const declining = direction === 'below' ? raw > 0.01 : raw < -0.01
  return improving ? 'up' : declining ? 'down' : 'flat'
}

function kpi(params: {
  slug: string
  appId: string
  name: string
  category: Category
  backendCategory: string
  unit: Unit
  rhythm?: DemoKpi['rhythm']
  ownerId: string
  target: number
  direction?: TargetDirection
  values: { date: string; value: number }[]
  description: string
  formula: string
  priority?: DemoKpi['priority']
  weight?: number
  why: string
}): DemoKpi {
  const direction = params.direction ?? 'above'
  const latest = params.values.at(-1)!
  const st = status(latest.value, params.target, direction)
  const owner = northstarPeople.find((p) => p.memberId === params.ownerId) ?? northstarPeople[0]!
  return {
    slug: params.slug,
    appId: params.appId,
    name: params.name,
    backendCategory: params.backendCategory,
    category: params.category,
    description: params.description,
    formula: params.formula,
    unit: params.unit,
    rhythm: params.rhythm ?? 'daily',
    ownerId: owner.memberId,
    ownerName: owner.name,
    ownerRole: owner.dbRole,
    targetNumeric: params.target,
    targetDisplay: fmt(params.target, params.unit),
    targetDirection: direction,
    currentValue: latest.value,
    currentValueDisplay: fmt(latest.value, params.unit),
    attainmentPct: attainment(latest.value, params.target, direction),
    status: st,
    deviationPct: deviation(latest.value, params.target, direction),
    trend: trend(params.values, direction),
    history: params.values.map((v) => ({ ...v, target: params.target })),
    priority: params.priority ?? 'medium',
    weight: params.weight ?? 3,
    whyItsCore: params.why,
  }
}

export function getNorthstarKpis(): DemoKpi[] {
  const series = <K extends keyof (typeof executiveDaily)[number]>(key: K) =>
    executiveDaily.map((row) => ({ date: row.date, value: Number(row[key]) }))
  const acq = <K extends keyof (typeof acquisition)[number]>(key: K) =>
    acquisition.map((row) => ({ date: row.date, value: Number(row[key]) }))

  const kpis = [
    kpi({
      slug: 'revenue',
      appId: 'ns-kpi-1',
      name: 'Revenue',
      category: 'business-performance',
      backendCategory: 'revenue',
      unit: 'currency',
      ownerId: 'ns-ceo',
      target: 1747088,
      values: series('revenue'),
      description: 'Primary revenue scorecard for the Northstar country business.',
      formula: 'Daily revenue from approved applications and partner payouts.',
      priority: 'critical',
      weight: 5,
      why: 'The main scorecard for whether acquisition, partner approvals and monetization are working together.',
    }),
    kpi({
      slug: 'gross_profit',
      appId: 'ns-kpi-2',
      name: 'Gross Profit',
      category: 'business-performance',
      backendCategory: 'revenue',
      unit: 'currency',
      ownerId: 'ns-cfo',
      target: 821131,
      values: series('gp'),
      description: 'Gross profit generated by the executive funnel.',
      formula: 'Revenue less direct partner and acquisition costs.',
      priority: 'critical',
      weight: 5,
      why: 'Revenue recovery matters only if it protects contribution quality.',
    }),
    kpi({
      slug: 'gross_margin_pct',
      appId: 'ns-kpi-3',
      name: 'Gross Margin %',
      category: 'profitability',
      backendCategory: 'profitability',
      unit: 'percentage',
      ownerId: 'ns-cfo',
      target: 45,
      values: series('margin'),
      description: 'Gross profit as a percentage of revenue.',
      formula: 'Gross profit / revenue.',
      priority: 'high',
      why: 'Keeps growth from masking margin erosion.',
    }),
    kpi({
      slug: 'revenue_forecast',
      appId: 'ns-kpi-4',
      name: 'Revenue Forecast',
      category: 'operations',
      backendCategory: 'forecast',
      unit: 'currency',
      ownerId: 'ns-ceo',
      target: 30000000,
      values: series('forecast'),
      description: 'Projected month-end revenue based on current run rate.',
      formula: 'Run-rate forecast from daily revenue.',
      priority: 'critical',
      weight: 5,
      why: 'Shows where the business is expected to finish before the month closes.',
    }),
    kpi({
      slug: 'forecast_variance_vs_plan',
      appId: 'ns-kpi-5',
      name: 'Forecast Variance vs Plan',
      category: 'operations',
      backendCategory: 'forecast',
      unit: 'percentage',
      ownerId: 'ns-ceo',
      target: 0,
      values: series('variance'),
      description: 'Forecasted finish versus the monthly plan.',
      formula: '(Forecast - plan) / plan.',
      priority: 'critical',
      weight: 5,
      why: 'The earliest executive warning that the plan is no longer achievable without intervention.',
    }),
    kpi({
      slug: 'website_visits',
      appId: 'ns-kpi-6',
      name: 'Website Visits',
      category: 'growth-engine',
      backendCategory: 'acquisition',
      unit: 'number',
      ownerId: 'ns-growth',
      target: 23000,
      values: series('visits'),
      description: 'Top-of-funnel website traffic across paid, organic, affiliate and CRM sources.',
      formula: 'Daily website sessions.',
      priority: 'high',
      weight: 4,
      why: 'Traffic softness is the first leak in the approval and revenue funnel.',
    }),
    kpi({
      slug: 'eligible_leads',
      appId: 'ns-kpi-7',
      name: 'Eligible Leads',
      category: 'growth-engine',
      backendCategory: 'acquisition',
      unit: 'number',
      ownerId: 'ns-growth',
      target: 950,
      values: series('leads'),
      description: 'Leads meeting eligibility criteria for partner products.',
      formula: 'Eligible leads from campaign and traffic sources.',
      priority: 'high',
      why: 'Eligibility quality determines whether traffic can convert to commercial outcomes.',
    }),
    kpi({
      slug: 'approved_applications',
      appId: 'ns-kpi-8',
      name: 'Approved Applications',
      category: 'growth-engine',
      backendCategory: 'acquisition',
      unit: 'number',
      ownerId: 'ns-paid',
      target: 220,
      values: series('approvals'),
      description: 'Applications approved by partner banks, insurers and vertical partners.',
      formula: 'Approved applications from submitted applications.',
      priority: 'critical',
      weight: 5,
      why: 'Approvals are the bridge from marketing activity to booked revenue.',
    }),
    kpi({
      slug: 'approval_rate',
      appId: 'ns-kpi-9',
      name: 'Approval Rate',
      category: 'growth-engine',
      backendCategory: 'acquisition',
      unit: 'percentage',
      ownerId: 'ns-partners',
      target: 37,
      values: series('approvalRate'),
      description: 'Percent of submitted applications approved by partners.',
      formula: 'Approved applications / applications submitted.',
      priority: 'high',
      why: 'Detects partner underwriting or eligibility shifts that can break economics even when traffic is healthy.',
    }),
    kpi({
      slug: 'visit_to_approval_conversion',
      appId: 'ns-kpi-10',
      name: 'Visit-to-Approval Conversion Rate',
      category: 'growth-engine',
      backendCategory: 'acquisition',
      unit: 'percentage',
      ownerId: 'ns-growth',
      target: 1,
      values: series('visitApproval'),
      description: 'Full-funnel conversion from website visits to approved applications.',
      formula: 'Approved applications / website visits.',
      priority: 'high',
      why: 'Combines demand quality, funnel conversion and approval quality into one executive signal.',
    }),
    kpi({
      slug: 'paid_acquisition_cpa',
      appId: 'ns-kpi-11',
      name: 'Paid Acquisition CPA',
      category: 'profitability',
      backendCategory: 'profitability',
      unit: 'currency',
      ownerId: 'ns-paid',
      target: 1180,
      direction: 'below',
      values: acq('cpa'),
      description: 'Cost per approved application across paid acquisition campaigns.',
      formula: 'Paid media spend / approved applications.',
      priority: 'high',
      why: 'Shows whether acquisition efficiency is protected while approvals recover.',
    }),
    kpi({
      slug: 'paid_roas',
      appId: 'ns-kpi-12',
      name: 'Paid ROAS',
      category: 'profitability',
      backendCategory: 'profitability',
      unit: 'ratio',
      ownerId: 'ns-paid',
      target: 1.8,
      values: acq('roas'),
      description: 'Revenue returned per peso of paid acquisition spend.',
      formula: 'Revenue / paid media spend.',
      priority: 'medium',
      why: 'Separates efficient paid growth from volume purchased at weak economics.',
    }),
    kpi({
      slug: 'affiliate_revenue',
      appId: 'ns-kpi-20',
      name: 'Affiliate Revenue',
      category: 'growth-engine',
      backendCategory: 'affiliate',
      unit: 'currency',
      ownerId: 'ns-affiliate',
      target: 700000,
      rhythm: 'weekly',
      values: affiliateTrend.map((row) => ({ date: row.weekStart, value: row.revenue })),
      description: 'Weekly revenue generated by affiliate and influencer partners.',
      formula: 'Affiliate and influencer revenue from approved conversions.',
      priority: 'high',
      weight: 4,
      why: 'Affiliate is a material acquisition channel, but economics vary sharply by partner.',
    }),
    kpi({
      slug: 'affiliate_approved_conversions',
      appId: 'ns-kpi-21',
      name: 'Affiliate Approved Conversions',
      category: 'growth-engine',
      backendCategory: 'affiliate',
      unit: 'number',
      ownerId: 'ns-affiliate',
      target: 380,
      rhythm: 'weekly',
      values: affiliateTrend.map((row) => ({ date: row.weekStart, value: row.approvedConversions })),
      description: 'Approved conversions from affiliate and influencer partners.',
      formula: 'Approved affiliate conversions after partner review.',
      priority: 'high',
      weight: 4,
      why: 'Shows whether creator and affiliate volume is turning into usable partner approvals.',
    }),
    kpi({
      slug: 'telesales_approved_applications',
      appId: 'ns-kpi-22',
      name: 'Telesales Approved Applications',
      category: 'growth-engine',
      backendCategory: 'telesales',
      unit: 'number',
      ownerId: 'ns-telesales',
      target: 80,
      values: telesalesTrend.map((row) => ({ date: row.date, value: row.approvedApplications })),
      description: 'Applications approved from telesales-assisted customer journeys.',
      formula: 'Approved applications from telesales submissions.',
      priority: 'high',
      weight: 4,
      why: 'Telesales is the assisted-conversion lever when self-serve funnel quality is under pressure.',
    }),
    kpi({
      slug: 'telesales_contact_rate',
      appId: 'ns-kpi-23',
      name: 'Telesales Contact Rate',
      category: 'operations',
      backendCategory: 'telesales',
      unit: 'percentage',
      ownerId: 'ns-telesales',
      target: 42,
      values: telesalesTrend.map((row) => ({ date: row.date, value: row.contactRate })),
      description: 'Percent of telesales calls that reach a contact.',
      formula: 'Contacts made / calls made.',
      priority: 'medium',
      why: 'Separates agent effort from reachable lead quality.',
    }),
    kpi({
      slug: 'telesales_revenue',
      appId: 'ns-kpi-24',
      name: 'Telesales Revenue',
      category: 'business-performance',
      backendCategory: 'telesales',
      unit: 'currency',
      ownerId: 'ns-telesales',
      target: 10000,
      values: telesalesTrend.map((row) => ({ date: row.date, value: row.revenue })),
      description: 'Revenue from telesales-assisted approvals.',
      formula: 'Partner revenue tied to telesales-assisted conversions.',
      priority: 'medium',
      why: 'Shows whether assisted selling is producing commercial value, not only activity volume.',
    }),
    kpi({
      slug: 'cross_sell_rate',
      appId: 'ns-kpi-13',
      name: 'Cross-Sell Rate',
      category: 'growth-engine',
      backendCategory: 'retention',
      unit: 'percentage',
      ownerId: 'ns-crm',
      target: 10,
      values: series('crossSell'),
      description: 'Percent of active users taking another product journey.',
      formula: 'Cross-sell users / active users.',
      priority: 'medium',
      why: 'Shows whether Northstar is becoming a lifecycle platform rather than a one-time acquisition engine.',
    }),
    kpi({
      slug: 'repeat_product_adoption',
      appId: 'ns-kpi-14',
      name: 'Repeat Product Adoption',
      category: 'growth-engine',
      backendCategory: 'retention',
      unit: 'percentage',
      ownerId: 'ns-crm',
      target: 14,
      values: series('repeat'),
      description: 'Repeat adoption across product categories.',
      formula: 'Repeat product adopters / active users.',
      priority: 'medium',
      why: 'Validates lifecycle journeys and customer relevance.',
    }),
    kpi({
      slug: 'customer_ltv',
      appId: 'ns-kpi-15',
      name: 'Customer Lifetime Value',
      category: 'profitability',
      backendCategory: 'retention',
      unit: 'currency',
      ownerId: 'ns-crm',
      target: 2500,
      values: series('ltv'),
      description: 'Estimated customer lifetime value.',
      formula: 'Modeled LTV from product adoption and monetization.',
      priority: 'medium',
      why: 'Confirms whether lifecycle engagement is becoming measurable value.',
    }),
    kpi({
      slug: 'revenue_from_new_verticals',
      appId: 'ns-kpi-16',
      name: 'Revenue from New Verticals',
      category: 'business-performance',
      backendCategory: 'expansion',
      unit: 'currency',
      ownerId: 'ns-intel',
      target: 1000000,
      rhythm: 'weekly',
      values: [
        { date: '2026-06-30', value: 923084 },
        { date: '2026-07-31', value: 869782 },
        { date: '2026-08-03', value: 672893 },
        { date: '2026-08-10', value: 929194 },
        { date: '2026-08-17', value: 1141131 },
      ],
      description: 'Revenue from insurance, digital banks and broadband expansion.',
      formula: 'Insurance + digital bank + broadband revenue.',
      priority: 'medium',
      why: 'Measures whether expansion beyond core financial products is becoming material.',
    }),
    kpi({
      slug: 'broadband_revenue',
      appId: 'ns-kpi-17',
      name: 'Broadband Revenue',
      category: 'business-performance',
      backendCategory: 'expansion',
      unit: 'currency',
      ownerId: 'ns-intel',
      target: 250000,
      rhythm: 'weekly',
      values: [
        { date: '2026-06-30', value: 160201 },
        { date: '2026-07-31', value: 195694 },
        { date: '2026-08-03', value: 164405 },
        { date: '2026-08-10', value: 234334 },
        { date: '2026-08-17', value: 292347 },
      ],
      description: 'Revenue generated by broadband vertical partners.',
      formula: 'Broadband partner revenue.',
      priority: 'medium',
      why: 'Highlights the strongest new vertical growth story in the demo data.',
    }),
    kpi({
      slug: 'partner_sla',
      appId: 'ns-kpi-18',
      name: 'Partner SLA',
      category: 'operations',
      backendCategory: 'partner_health',
      unit: 'percentage',
      ownerId: 'ns-partners',
      target: 94,
      rhythm: 'weekly',
      values: [
        { date: '2026-06-30', value: 94.0 },
        { date: '2026-07-31', value: 94.5 },
        { date: '2026-08-03', value: 94.0 },
        { date: '2026-08-10', value: 94.5 },
        { date: '2026-08-17', value: 95.1 },
      ],
      description: 'Average partner service-level performance across active partners.',
      formula: 'Average partner SLA rate.',
      priority: 'medium',
      why: 'Protects customer experience and partner turnaround quality.',
    }),
    kpi({
      slug: 'pipeline_value',
      appId: 'ns-kpi-19',
      name: 'Pipeline Value',
      category: 'operations',
      backendCategory: 'expansion',
      unit: 'currency',
      ownerId: 'ns-intel',
      target: 12000000,
      rhythm: 'weekly',
      values: [
        { date: '2026-06-30', value: 10600000 },
        { date: '2026-07-31', value: 13200000 },
        { date: '2026-08-03', value: 13850000 },
        { date: '2026-08-10', value: 14500000 },
        { date: '2026-08-17', value: 15150000 },
      ],
      description: 'Future vertical pipeline value.',
      formula: 'Sum of qualified future vertical opportunities.',
      priority: 'low',
      why: 'Shows the expansion runway beyond current-week revenue.',
    }),
  ]

  for (const p of northstarPeople) {
    p.ownedKpiIds = p.memberId === 'ns-ceo' ? kpis.map((x) => x.appId) : kpis.filter((x) => x.ownerId === p.memberId).map((x) => x.appId)
  }

  return kpis
}

export function getNorthstarPerson(memberId?: string | null) {
  return northstarPeople.find((p) => p.memberId === memberId) ?? northstarPeople[0]!
}

export function getNorthstarPersonByUser(userId?: string | null) {
  return northstarPeople.find((p) => p.userId === userId) ?? northstarPeople[0]!
}

export function kpisForMember(memberId?: string | null) {
  const person = getNorthstarPerson(memberId)
  const kpis = getNorthstarKpis()
  if (person.role === 'ceo') return kpis
  return kpis.filter((k) => k.ownerId === person.memberId)
}

export function homeSummary(memberId?: string | null) {
  const kpis = kpisForMember(memberId)
  const offTrack = kpis.filter((k) => k.status === 'off-track')
  const atRisk = kpis.filter((k) => k.status === 'at-risk')
  return {
    kpis,
    offTrack,
    atRisk,
    alerts: northstarAlerts,
  }
}
