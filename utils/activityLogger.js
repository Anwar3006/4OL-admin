import { supabase } from '@/app/utils/supabaseClient';

/**
 * Enhanced device information detection
 * @returns {Object} Enhanced device information
 */
const getEnhancedDeviceInfo = () => {
  if (typeof window === "undefined") return {};

  const userAgent = navigator.userAgent;
  const platform = navigator.platform;
  
  // Mobile detection
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isTablet = /iPad|Android(?=.*\bMobile\b)/i.test(userAgent) || 
                   (screen.width >= 768 && screen.height >= 1024 && isMobile);
  
  // Android detection
  const androidMatch = userAgent.match(/Android\s+([\d.]+)/);
  const androidVersion = androidMatch ? androidMatch[1] : null;
  
  // iOS detection
  const iosMatch = userAgent.match(/OS\s+([\d_]+)/);
  const iosVersion = iosMatch ? iosMatch[1].replace(/_/g, '.') : null;
  
  // Device model detection
  let deviceModel = "Unknown";
  let manufacturer = "Unknown";
  let systemName = "Unknown";
  let systemVersion = "Unknown";
  let deviceName = "Unknown";
  let deviceId = "unknown";

  if (androidMatch) {
    systemName = "Android";
    systemVersion = androidVersion;
    
    // Common Android device detection
    if (userAgent.includes("Pixel")) {
      const pixelMatch = userAgent.match(/Pixel\s+(\d+)/);
      deviceModel = pixelMatch ? `Pixel ${pixelMatch[1]}` : "Pixel";
      manufacturer = "Google";
      deviceName = deviceModel;
      deviceId = userAgent.includes("Pixel 4") ? "flame" : "pixel";
    } else if (userAgent.includes("Samsung")) {
      manufacturer = "Samsung";
      deviceModel = "Samsung Device";
      deviceName = "Samsung Device";
      deviceId = "samsung";
    } else if (userAgent.includes("OnePlus")) {
      manufacturer = "OnePlus";
      deviceModel = "OnePlus Device";
      deviceName = "OnePlus Device";
      deviceId = "oneplus";
    } else {
      manufacturer = "Android OEM";
      deviceModel = "Android Device";
      deviceName = "Android Device";
      deviceId = "android";
    }
  } else if (iosMatch) {
    systemName = "iOS";
    systemVersion = iosVersion;
    
    if (userAgent.includes("iPhone")) {
      manufacturer = "Apple";
      deviceModel = "iPhone";
      deviceName = "iPhone";
      deviceId = "iphone";
    } else if (userAgent.includes("iPad")) {
      manufacturer = "Apple";
      deviceModel = "iPad";
      deviceName = "iPad";
      deviceId = "ipad";
    } else {
      manufacturer = "Apple";
      deviceModel = "iOS Device";
      deviceName = "iOS Device";
      deviceId = "ios";
    }
  } else {
    // Desktop detection
    systemName = platform.includes("Win") ? "Windows" : 
                 platform.includes("Mac") ? "macOS" : 
                 platform.includes("Linux") ? "Linux" : "Unknown";
    systemVersion = "Desktop";
    manufacturer = "Desktop";
    deviceModel = "Desktop";
    deviceName = "Desktop";
    deviceId = "desktop";
  }

  return {
    model: deviceModel,
    deviceId: deviceId,
    isTablet: isTablet,
    deviceName: deviceName,
    systemName: systemName,
    manufacturer: manufacturer,
    systemVersion: systemVersion,
    isMobile: isMobile,
    screenWidth: screen.width,
    screenHeight: screen.height,
    pixelRatio: window.devicePixelRatio || 1
  };
};

/**
 * Generic activity logging function
 * @param {Object} activityData - Activity data object
 * @param {string} activityData.userId - User ID performing the action
 * @param {string} activityData.userName - User name performing the action
 * @param {string} activityData.type - Type of activity (authentication, facility, disease, etc.)
 * @param {string} activityData.description - Description of the activity
 * @param {string} [activityData.reference] - Reference information
 * @param {string} [activityData.referenceId] - Reference ID
 * @param {string} [activityData.ip] - IP address
 * @param {Object} [activityData.deviceInfo] - Device information
 * @returns {Promise<boolean>} - Success status
 */
export const logActivity = async (activityData) => {
  try {
    const {
      userId, userName, type, description,
      reference = null, referenceId = null, ip = null, deviceInfo = null
    } = activityData;

    // Validate required fields
    if (!userId || !userName || !type || !description) {
      console.warn("Missing required fields for activity logging:", { userId, userName, type, description });
      return false;
    }

    // Get current timestamp as bigint (Unix timestamp in milliseconds)
    const timestamp = Date.now().toString();

    // Get device info if not provided
    let deviceInfoData = deviceInfo;
    if (!deviceInfoData && typeof window !== "undefined") {
      // Basic device info
      const basicInfo = {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        screenResolution: `${screen.width}x${screen.height}`,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      // Enhanced device detection
      const enhancedInfo = getEnhancedDeviceInfo();
      
      deviceInfoData = {
        ...basicInfo,
        ...enhancedInfo
      };
    }

    // Get IP address if not provided
    let ipAddress = ip;
    if (!ipAddress && typeof window !== "undefined") {
      try {
        // Try to get IP from a public API (this is a simple approach)
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        ipAddress = data.ip;
      } catch (error) {
        console.warn("Could not fetch IP address:", error);
        ipAddress = "Unknown";
      }
    }

    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: userId,
        user_name: userName,
        type: type,
        description: description,
        reference: reference,
        reference_id: referenceId,
        ip: ipAddress,
        timestamp: timestamp,
        device_info: deviceInfoData,
        created_by: userId,
        updated_by: userId,
        is_created_by_admin_panel: true
      });

    if (error) {
      console.error("Error logging activity:", error);
      return false;
    }

    console.log("Activity logged successfully:", { 
      type, 
      description, 
      userId, 
      userName,
      timestamp,
      ip: ipAddress,
      deviceInfo: deviceInfoData
    });
    return true;
  } catch (error) {
    console.error("Unexpected error in activity logging:", error);
    return false;
  }
};

/**
 * Log authentication activities
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} action - Action performed (logged in, logged out, etc.)
 * @param {string} [ip] - IP address
 * @returns {Promise<boolean>} - Success status
 */
export const logAuthActivity = async (userId, userName, action, ip = null) => {
  console.log("Logging auth activity:", { userId, userName, action, ip });
  return await logActivity({
    userId,
    userName,
    type: "authentication",
    description: `User ${action}`,
    ip
  });
};

/**
 * Log facility activities
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} action - Action performed
 * @param {string} [facilityId] - Facility ID
 * @param {string} [ip] - IP address
 * @returns {Promise<boolean>} - Success status
 */
export const logFacilityActivity = async (userId, userName, action, facilityId = null, ip = null) => {
  return await logActivity({
    userId,
    userName,
    type: "facility",
    description: `Facility ${action}`,
    reference: facilityId,
    referenceId: facilityId,
    ip
  });
};

/**
 * Log disease activities
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} action - Action performed
 * @param {string} [diseaseId] - Disease ID
 * @param {string} [ip] - IP address
 * @returns {Promise<boolean>} - Success status
 */
export const logDiseaseActivity = async (userId, userName, action, diseaseId = null, ip = null) => {
  return await logActivity({
    userId,
    userName,
    type: "disease",
    description: `Disease ${action}`,
    reference: diseaseId,
    referenceId: diseaseId,
    ip
  });
};

/**
 * Log symptom activities
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} action - Action performed
 * @param {string} [symptomId] - Symptom ID
 * @param {string} [ip] - IP address
 * @returns {Promise<boolean>} - Success status
 */
export const logSymptomActivity = async (userId, userName, action, symptomId = null, ip = null) => {
  return await logActivity({
    userId,
    userName,
    type: "symptom",
    description: `Symptom ${action}`,
    reference: symptomId,
    referenceId: symptomId,
    ip
  });
};

/**
 * Log healthy living activities
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} action - Action performed
 * @param {string} [articleId] - Article ID
 * @param {string} [ip] - IP address
 * @returns {Promise<boolean>} - Success status
 */
export const logHealthyLivingActivity = async (userId, userName, action, articleId = null, ip = null) => {
  return await logActivity({
    userId,
    userName,
    type: "healthy_living",
    description: `Healthy Living article ${action}`,
    reference: articleId,
    referenceId: articleId,
    ip
  });
};

/**
 * Log user management activities
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @param {string} action - Action performed
 * @param {string} [targetUserId] - Target user ID
 * @param {string} [ip] - IP address
 * @returns {Promise<boolean>} - Success status
 */
export const logUserActivity = async (userId, userName, action, targetUserId = null, ip = null) => {
  return await logActivity({
    userId,
    userName,
    type: "user_management",
    description: `User ${action}`,
    reference: targetUserId,
    referenceId: targetUserId,
    ip
  });
};
