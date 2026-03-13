// utils/activityLogger.js
import { supabase } from "@/app/utils/supabaseClient";

/**
 * activity_logs table schema:
 *   id          uuid  PK
 *   actor_id    text          — the user performing the action
 *   actor_name  text          — their full name / email
 *   action_type text NOT NULL — e.g. "auth:logged_in", "admin:updated_facility"
 *   target_table text NOT NULL — e.g. "auth", "facility_profile", "user_profiles"
 *   record_id   text          — FK to the affected row (nullable)
 *   old_data    jsonb         — state before the change (nullable)
 *   new_data    jsonb         — state after the change (nullable)
 *   created_at  timestamptz   — default now()
 */

// ─────────────────────────────────────────────────────────────────────────────
// Core insert helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Insert a single row into activity_logs using the real table schema.
 *
 * @param {Object} params
 * @param {string}  params.actorId      - ID of the user performing the action
 * @param {string}  params.actorName    - Full name or email of the actor
 * @param {string}  params.actionType   - Slash-namespaced action, e.g. "auth:logged_out"
 * @param {string}  params.targetTable  - Which DB table is affected, e.g. "auth"
 * @param {string}  [params.recordId]   - ID of the affected record (optional)
 * @param {Object}  [params.oldData]    - Previous state snapshot (optional)
 * @param {Object}  [params.newData]    - New state snapshot (optional)
 * @returns {Promise<{success: boolean, data?: any, error?: any}>}
 */
const insertActivityLog = async ({
  actorId,
  actorName,
  actionType,
  targetTable,
  recordId = null,
  oldData = null,
  newData = null,
}) => {
  try {
    const { data, error } = await supabase
      .from("activity_logs")
      .insert([
        {
          actor_id: actorId ?? null,
          actor_name: actorName ?? null,
          action_type: actionType,
          target_table: targetTable,
          record_id: recordId ?? null,
          old_data: oldData ?? null,
          new_data: newData ?? null,
          // created_at has a server-side default — omit it
        },
      ])
      .select();

    if (error) {
      console.error("[activityLogger] Insert error:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error("[activityLogger] Unexpected error:", err);
    return { success: false, error: err };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Public helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Log an authentication event (login / logout / password reset, etc.)
 *
 * @param {string} userId    - ID of the user
 * @param {string} userName  - Full name or email
 * @param {string} action    - Human-readable verb, e.g. "logged in" | "logged out"
 */
export const logAuthActivity = async (userId, userName, action) => {
  return insertActivityLog({
    actorId: userId,
    actorName: userName,
    // "auth:logged_in" / "auth:logged_out" — normalise spaces to underscores
    actionType: `auth:${action.replace(/\s+/g, "_")}`,
    targetTable: "auth",
    recordId: userId ?? null,
  });
};

/**
 * Log a general user-management action (create, update, suspend, delete user).
 *
 * @param {string} actorId       - Admin performing the action
 * @param {string} actorName     - Admin's full name
 * @param {string} action        - e.g. "created", "updated", "suspended"
 * @param {string} targetUserId  - ID of the affected user
 * @param {string} [targetUserName] - Name of the affected user
 * @param {Object} [metadata]    - Optional extra context stored in new_data
 */
export const logUserActivity = async (
  actorId,
  actorName,
  action,
  targetUserId,
  targetUserName = null,
  metadata = {}
) => {
  return insertActivityLog({
    actorId,
    actorName,
    actionType: `user:${action.replace(/\s+/g, "_")}`,
    targetTable: "user_profiles",
    recordId: targetUserId ?? null,
    newData: {
      ...(targetUserName ? { target_user_name: targetUserName } : {}),
      ...metadata,
    },
  });
};

/**
 * Log a data modification (create / update / delete) on any table.
 *
 * @param {string} userId      - Actor performing the change
 * @param {string} userName    - Actor's full name
 * @param {string} action      - e.g. "created", "updated", "deleted"
 * @param {string} entityType  - Table name, e.g. "facility_profile"
 * @param {string} entityId    - PK of the affected row
 * @param {string} [entityName]- Human-readable label for the record
 * @param {Object} [metadata]  - Optional old/new state or extra info
 */
export const logDataModification = async (
  userId,
  userName,
  action,
  entityType,
  entityId,
  entityName = null,
  metadata = {}
) => {
  return insertActivityLog({
    actorId: userId,
    actorName: userName,
    actionType: `${entityType}:${action.replace(/\s+/g, "_")}`,
    targetTable: entityType,
    recordId: entityId ?? null,
    newData: {
      ...(entityName ? { record_name: entityName } : {}),
      ...metadata,
    },
  });
};

/**
 * Log a generic admin-panel action that doesn't target a specific table row.
 *
 * @param {string} userId       - Admin user ID
 * @param {string} userName     - Admin full name
 * @param {string} action       - Short label, e.g. "exported_report"
 * @param {string} description  - Longer description stored in new_data
 * @param {Object} [metadata]   - Optional extra context
 */
export const logAdminAction = async (
  userId,
  userName,
  action,
  description,
  metadata = {}
) => {
  return insertActivityLog({
    actorId: userId,
    actorName: userName,
    actionType: `admin:${action.replace(/\s+/g, "_")}`,
    targetTable: "admin_panel",
    newData: {
      description,
      ...metadata,
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Read helpers (unchanged column names — these already use real schema columns)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch activity logs with optional filters.
 *
 * @param {Object}  [filters]
 * @param {string}  [filters.actorId]     - Filter by actor
 * @param {string}  [filters.actionType]  - Exact match on action_type
 * @param {string}  [filters.targetTable] - Exact match on target_table
 * @param {Date}    [filters.startDate]
 * @param {Date}    [filters.endDate]
 * @param {number}  [filters.limit=50]
 */
export const fetchActivityLogs = async (filters = {}) => {
  try {
    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("created_at", { ascending: false });

    if (filters.actorId) {
      query = query.eq("actor_id", filters.actorId);
    }
    if (filters.actionType) {
      query = query.eq("action_type", filters.actionType);
    }
    if (filters.targetTable) {
      query = query.eq("target_table", filters.targetTable);
    }
    if (filters.startDate) {
      query = query.gte("created_at", filters.startDate.toISOString());
    }
    if (filters.endDate) {
      query = query.lte("created_at", filters.endDate.toISOString());
    }

    query = query.limit(filters.limit ?? 50);

    const { data, error } = await query;

    if (error) {
      console.error("[activityLogger] Fetch error:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error("[activityLogger] Fetch exception:", err);
    return { data: null, error: err };
  }
};

/** Convenience wrappers */
export const getUserActivityLogs = (userId, limit = 20) =>
  fetchActivityLogs({ actorId: userId, limit });

export const getRecentActivityLogs = (limit = 50) =>
  fetchActivityLogs({ limit });

export const getAuthActivityLogs = (limit = 50) =>
  fetchActivityLogs({ targetTable: "auth", limit });

export const getAdminActionLogs = (limit = 50) =>
  fetchActivityLogs({ targetTable: "admin_panel", limit });
