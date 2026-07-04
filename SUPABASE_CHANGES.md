# Supabase Changes & Documentation

This document tracks changes made to the Supabase database schema and RPC functions to support the enterprise-grade dashboard.

## New / Updated RPC Functions

### 1. `get_platform_overview_metrics(time_filter text)`
- **Description**: Fetches high-level KPIs for the dashboard overview.
- **Used In**: Dashboard stats sections, KPI cards.
- **Implementation**: Aggregates users, revenue, and activity data based on the provided time filter.

### 2. `get_facility_analytics()`
- **Description**: Provides counts of facilities by status and type.
- **Used In**: Facilities management page KPI grid.

### 3. `bulk_delete_marketing_profiles(ids uuid[])`
- **Description**: Allows for efficient multi-deletion of marketing campaigns.
- **Used In**: Unified DataTable bulk action bar.

## Schema Enhancements

### Marketing Profiles
- Added indices on `status` and `createdAt` for faster filtering and sorting.
- Verified RLS policies allow for admin-only management.

## Custom API Requirements (Node.js)

While Supabase handles the majority of CRUD and simple aggregations, the following complex operations are recommended for a custom Node.js API:

1. **Complex Report Generation**: Generating large CSV/PDF exports with complex joins that might hit PostgREST timeouts.
2. **Scheduled Notifications**: Orchestrating complex notification flows (Push, Email, SMS) that require logic beyond simple database triggers.
3. **Advanced Analytics**: Real-time streaming analytics and complex trend analysis that might be too heavy for direct PostgreSQL queries.

## Mobile App Consistency

- **Real-time Sync**: The mobile app should subscribe to relevant table changes (e.g., `marketing_profile`) to show live promotions.
- **RPC Usage**: The mobile app can use the same RPC functions for stats if needed, ensuring consistency in KPI calculation across platforms.
