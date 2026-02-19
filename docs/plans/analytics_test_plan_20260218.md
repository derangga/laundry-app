# Analytics Dashboard API — Test Plan

**Date**: 2026-02-18
**Phase**: 11
**Endpoints**: `GET /api/analytics/weekly`, `GET /api/analytics/dashboard`

---

## Unit Tests: `AnalyticsService`

File: `backend/test/usecase/analytics/AnalyticsService.test.ts`

| # | Test | Expected |
|---|------|----------|
| U1 | `zeroFillWeeks` with empty rows for 4 weeks | Returns 4 `WeeklyDataPoint`s with `total_revenue: 0, order_count: 0` |
| U2 | `zeroFillWeeks` with data rows — some weeks have data, some don't | Data weeks preserve values; missing weeks show zeros |
| U3 | `getWeeklyAnalytics` with `paymentFilter = 'all'` | Calls repo with `Option.none()` |
| U4 | `getWeeklyAnalytics` with `paymentFilter = 'paid'` | Calls repo with `Option.some('paid')` |
| U5 | `getDashboardStats` runs 4 queries concurrently | Returns `DashboardStatsResponse` with all 4 fields |
| U6 | `computeDateRange('last_4_weeks')` | `start = today - 28d, end = tomorrow` |
| U7 | `computeDateRange('this_year')` | `start = Jan 1 current year` |
| U8 | `computeDateRange('last_year')` | `start = Jan 1 prev year, end = Jan 1 current year` |
| U9 | `computeDateRange(undefined / unknown)` | Falls back to `last_12_weeks` |

---

## Integration Tests: `GET /api/analytics/weekly`

File: `backend/test/api/analyticsRoutes.test.ts`

| # | Test | Expected |
|---|------|----------|
| I1 | No params (default range) | 200 with zero-filled weeks for last 12 weeks |
| I2 | `?payment_status=paid` | 200, only paid orders aggregated |
| I3 | `?payment_status=unpaid` | 200, only unpaid orders aggregated |
| I4 | `?payment_status=all` (explicit) | 200, all orders aggregated |
| I5 | `?payment_status=invalid` | 400 `ValidationError` |
| I6 | `?range=last_4_weeks` | 200, ~4 weeks of data |
| I7 | `?range=last_6_months` | 200, ~26 weeks of data |
| I8 | `?range=this_year` | 200, weeks since Jan 1 |
| I9 | `?range=last_year` | 200, weeks of previous year |
| I10 | `?start_date=2026-01-01&end_date=2026-02-01` | 200, custom range |
| I11 | `?start_date=bad-date&end_date=2026-02-01` | 400 `ValidationError` |
| I12 | `?start_date=2026-02-01&end_date=2026-01-01` (start >= end) | 400 `ValidationError` |
| I13 | Staff token (non-admin) | 403 `Forbidden` |
| I14 | No auth token | 401 `Unauthorized` |

---

## Integration Tests: `GET /api/analytics/dashboard`

File: `backend/test/api/analyticsRoutes.test.ts`

| # | Test | Expected |
|---|------|----------|
| I15 | Admin token | 200 with `todays_orders`, `pending_payments`, `weekly_revenue`, `total_customers` |
| I16 | All 4 fields are numbers | Response fields are numeric |
| I17 | Staff token | 403 `Forbidden` |
| I18 | No auth token | 401 `Unauthorized` |

---

## Notes

- `computeDateRange` is a module-level pure function in `AnalyticsHandlers.ts` — unit test it by extracting or duplicating its logic in tests
- Zero-fill aligns to Monday (ISO week start); test with date ranges that don't start on Monday
- Dashboard stats use `Effect.all` with `concurrency: 4` — verify all 4 fields are present in response
