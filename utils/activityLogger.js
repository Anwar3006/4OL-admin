// utils/activityLogger.js
import { supabase } from "@/app/utils/supabaseClient";

/**
 * Get device information from user agent
 * @param {String} userAgent - Browser user agent string
 * @returns {Object} Parsed device information
 */
const parseDeviceInfo = (userAgent) => {
  if (!userAgent) {
    return {
      browser: "Unknown",
      browser_version: "Unknown",
      os: "Unknown",
      os_version: "Unknown",
      device_type: "Unknown",
      device_vendor: "Unknown",
    };
  }

  const deviceInfo = {
    browser: "Unknown",
    browser_version: "Unknown",
    os: "Unknown",
    os_version: "Unknown",
    device_type: "desktop",
    device_vendor: "Unknown",
  };

  // Detect browser
  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) {
    deviceInfo.browser = "Chrome";
    const match = userAgent.match(/Chrome\/([\d.]+)/);
    deviceInfo.browser_version = match ? match[1] : "Unknown";
  } else if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) {
    deviceInfo.browser = "Safari";
    const match = userAgent.match(/Version\/([\d.]+)/);
    deviceInfo.browser_version = match ? match[1] : "Unknown";
  } else if (userAgent.includes("Firefox")) {
    deviceInfo.browser = "Firefox";
    const match = userAgent.match(/Firefox\/([\d.]+)/);
    deviceInfo.browser_version = match ? match[1] : "Unknown";
  } else if (userAgent.includes("Edg")) {
    deviceInfo.browser = "Edge";
    const match = userAgent.match(/Edg\/([\d.]+)/);
    deviceInfo.browser_version = match ? match[1] : "Unknown";
  }

  // Detect OS
  if (userAgent.includes("Windows")) {
    deviceInfo.os = "Windows";
    if (userAgent.includes("Windows NT 10.0")) deviceInfo.os_version = "10";
    else if (userAgent.includes("Windows NT 6.3"))
      deviceInfo.os_version = "8.1";
    else if (userAgent.includes("Windows NT 6.2")) deviceInfo.os_version = "8";
  } else if (userAgent.includes("Mac OS X")) {
    deviceInfo.os = "macOS";
    const match = userAgent.match(/Mac OS X ([\d_]+)/);
    deviceInfo.os_version = match ? match[1].replace(/_/g, ".") : "Unknown";
  } else if (userAgent.includes("Linux")) {
    deviceInfo.os = "Linux";
  } else if (userAgent.includes("Android")) {
    deviceInfo.os = "Android";
    const match = userAgent.match(/Android ([\d.]+)/);
    deviceInfo.os_version = match ? match[1] : "Unknown";
    deviceInfo.device_type = "mobile";
  } else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) {
    deviceInfo.os = "iOS";
    const match = userAgent.match(/OS ([\d_]+)/);
    deviceInfo.os_version = match ? match[1].replace(/_/g, ".") : "Unknown";
    deviceInfo.device_type = userAgent.includes("iPad") ? "tablet" : "mobile";
  }

  // Detect device type
  if (userAgent.includes("Mobile") && deviceInfo.device_type === "desktop") {
    deviceInfo.device_type = "mobile";
  } else if (userAgent.includes("Tablet")) {
    deviceInfo.device_type = "tablet";
  }

  return deviceInfo;
};

/**
 * Get client IP address
 * @returns {String|null} IP address or null
 */
const getClientIP = async () => {
  try {
    // Try to get IP from external service
    const response = await fetch("https://api.ipify.org?format=json");
    const data = await response.json();
    return data.ip;
  } catch (error) {
    console.warn("Could not fetch IP address:", error);
    return null;
  }
};

/**
 * Log a general user activity
 * @param {String} userId - User ID
 * @param {String} userName - User's full name or email
 * @param {String} type - Activity type (e.g., 'user_action', 'data_modification')
 * @param {String} action - Specific action (e.g., 'created user', 'updated facility')
 * @param {String} description - Detailed description (optional)
 * @param {String} reference - Type of entity (e.g., 'user', 'facility') (optional)
 * @param {String} referenceId - ID of referenced entity (optional)
 * @param {Boolean} isAdminPanel - Whether action was from admin panel
 * @param {Object} metadata - Additional data (optional)
 * @returns {Promise<Object>} Result of the log operation
 */
export const logActivity = async (
  userId,
  userName,
  type,
  action,
  description = null,
  reference = null,
  referenceId = null,
  isAdminPanel = false,
  metadata = {}
) => {
  try {
    // Get user agent and parse device info
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : null;
    const deviceInfo = parseDeviceInfo(userAgent);

    // Get IP address (optional - can be slow)
    const ipAddress = await getClientIP();

    const { data, error } = await supabase
      .from("activity_logs")
      .insert([
        {
          user_id: userId,
          user_name: userName,
          type: type,
          action: action,
          description: description,
          reference: reference,
          reference_id: referenceId,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_info: deviceInfo,
          is_created_by_admin_panel: isAdminPanel,
          metadata: metadata,
          timestamp: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Error logging activity:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception while logging activity:", error);
    return { success: false, error };
  }
};

/**
 * Log authentication activities (login, logout, password reset, etc.)
 * @param {String} userId - User ID
 * @param {String} userName - User's full name or email
 * @param {String} action - Auth action (e.g., 'logged in', 'logged out')
 * @param {String} ipAddress - IP address (optional)
 * @returns {Promise<Object>} Result of the log operation
 */
export const logAuthActivity = async (
  userId,
  userName,
  action,
  ipAddress = null
) => {
  try {
    const userAgent =
      typeof navigator !== "undefined" ? navigator.userAgent : null;
    const deviceInfo = parseDeviceInfo(userAgent);

    // Get IP if not provided
    if (!ipAddress) {
      ipAddress = await getClientIP();
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .insert([
        {
          user_id: userId,
          user_name: userName,
          type: "auth",
          action: action,
          description: `User ${action}`,
          ip_address: ipAddress,
          user_agent: userAgent,
          device_info: deviceInfo,
          is_created_by_admin_panel: false,
          timestamp: new Date().toISOString(),
        },
      ])
      .select();

    if (error) {
      console.error("Error logging auth activity:", error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (error) {
    console.error("Exception while logging auth activity:", error);
    return { success: false, error };
  }
};

/**
 * Log user management activities (create, update, delete users)
 * @param {String} actorId - ID of user performing the action
 * @param {String} actorName - Name of user performing the action
 * @param {String} action - Action performed
 * @param {String} targetUserId - ID of affected user
 * @param {String} targetUserName - Name of affected user
 * @param {Object} metadata - Additional data (optional)
 * @returns {Promise<Object>} Result of the log operation
 */
export const logUserActivity = async (
  actorId,
  actorName,
  action,
  targetUserId,
  targetUserName = null,
  metadata = {}
) => {
  return logActivity(
    actorId,
    actorName,
    "user_action",
    action,
    `${actorName} ${action}${targetUserName ? ` ${targetUserName}` : ""}`,
    "user",
    targetUserId,
    true, // Assume user management is done via admin panel
    metadata
  );
};

/**
 * Log data modification activities (create, update, delete records)
 * @param {String} userId - User ID
 * @param {String} userName - User's full name or email
 * @param {String} action - Action performed (e.g., 'created', 'updated', 'deleted')
 * @param {String} entityType - Type of entity (e.g., 'facility', 'review', 'disease')
 * @param {String} entityId - ID of the entity
 * @param {String} entityName - Name/title of the entity (optional)
 * @param {Object} metadata - Additional data like old/new values (optional)
 * @returns {Promise<Object>} Result of the log operation
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
  return logActivity(
    userId,
    userName,
    "data_modification",
    `${action} ${entityType}`,
    `${userName} ${action} ${entityType}${entityName ? ` "${entityName}"` : ""}`,
    entityType,
    entityId,
    true,
    metadata
  );
};

/**
 * Log admin panel activities
 * @param {String} userId - Admin user ID
 * @param {String} userName - Admin user's name
 * @param {String} action - Action performed
 * @param {String} description - Description of the action
 * @param {Object} metadata - Additional data (optional)
 * @returns {Promise<Object>} Result of the log operation
 */
export const logAdminAction = async (
  userId,
  userName,
  action,
  description,
  metadata = {}
) => {
  return logActivity(
    userId,
    userName,
    "admin_action",
    action,
    description,
    null,
    null,
    true,
    metadata
  );
};

/**
 * Fetch activity logs with filters
 * @param {Object} filters - Filter options
 * @param {String} filters.userId - Filter by user ID
 * @param {String} filters.type - Filter by activity type
 * @param {String} filters.action - Filter by action
 * @param {String} filters.reference - Filter by reference type
 * @param {Date} filters.startDate - Filter by start date
 * @param {Date} filters.endDate - Filter by end date
 * @param {Number} filters.limit - Limit number of results (default: 50)
 * @returns {Promise<Object>} Activity logs and error if any
 */
export const fetchActivityLogs = async (filters = {}) => {
  try {
    let query = supabase
      .from("activity_logs")
      .select("*")
      .order("timestamp", { ascending: false });

    // Apply filters
    if (filters.userId) {
      query = query.eq("user_id", filters.userId);
    }

    if (filters.type) {
      query = query.eq("type", filters.type);
    }

    if (filters.action) {
      query = query.eq("action", filters.action);
    }

    if (filters.reference) {
      query = query.eq("reference", filters.reference);
    }

    if (filters.startDate) {
      query = query.gte("timestamp", filters.startDate.toISOString());
    }

    if (filters.endDate) {
      query = query.lte("timestamp", filters.endDate.toISOString());
    }

    if (filters.limit) {
      query = query.limit(filters.limit);
    } else {
      query = query.limit(50); // Default limit
    }

    const { data, error } = await query;

    if (error) {
      console.error("Error fetching activity logs:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception while fetching activity logs:", error);
    return { data: null, error };
  }
};

/**
 * Get activity logs for a specific user
 * @param {String} userId - User ID
 * @param {Number} limit - Number of logs to fetch (default: 20)
 * @returns {Promise<Object>} User's activity logs
 */
export const getUserActivityLogs = async (userId, limit = 20) => {
  return fetchActivityLogs({ userId, limit });
};

/**
 * Get recent activity logs
 * @param {Number} limit - Number of logs to fetch (default: 50)
 * @returns {Promise<Object>} Recent activity logs
 */
export const getRecentActivityLogs = async (limit = 50) => {
  return fetchActivityLogs({ limit });
};

/**
 * Get authentication activity logs
 * @param {Number} limit - Number of logs to fetch (default: 50)
 * @returns {Promise<Object>} Auth activity logs
 */
export const getAuthActivityLogs = async (limit = 50) => {
  return fetchActivityLogs({ type: "auth", limit });
};

/**
 * Get admin action logs
 * @param {Number} limit - Number of logs to fetch (default: 50)
 * @returns {Promise<Object>} Admin action logs
 */
export const getAdminActionLogs = async (limit = 50) => {
  return fetchActivityLogs({ type: "admin_action", limit });
};
