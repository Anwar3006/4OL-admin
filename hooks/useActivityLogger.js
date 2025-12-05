import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { 
  logActivity, 
  logAuthActivity, 
  logFacilityActivity, 
  logDiseaseActivity, 
  logSymptomActivity, 
  logHealthyLivingActivity, 
  logUserActivity 
} from '@/utils/activityLogger';

/**
 * Custom hook for logging user activities
 * Automatically gets current user info from Redux store
 */
export const useActivityLogger = () => {
  const { userId, userRole } = useSelector((state) => state.auth);
  
  // Get user name from localStorage
  const getUserName = useCallback(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("user_email") || "Unknown User";
    }
    return "Unknown User";
  }, []);

  // Generic activity logger
  const logActivityAction = useCallback(async (type, description, reference = null, ip = null) => {
    if (!userId) {
      console.warn("No user ID available for activity logging");
      return false;
    }

    return await logActivity({
      userId,
      userName: getUserName(),
      type,
      description,
      reference,
      ip
    });
  }, [userId, getUserName]);

  // Specific activity loggers
  const logAuth = useCallback(async (action, ip = null) => {
    if (!userId) return false;
    return await logAuthActivity(userId, getUserName(), action, ip);
  }, [userId, getUserName]);

  const logFacility = useCallback(async (action, facilityId = null, ip = null) => {
    if (!userId) return false;
    return await logFacilityActivity(userId, getUserName(), action, facilityId, ip);
  }, [userId, getUserName]);

  const logDisease = useCallback(async (action, diseaseId = null, ip = null) => {
    if (!userId) return false;
    return await logDiseaseActivity(userId, getUserName(), action, diseaseId, ip);
  }, [userId, getUserName]);

  const logSymptom = useCallback(async (action, symptomId = null, ip = null) => {
    if (!userId) return false;
    return await logSymptomActivity(userId, getUserName(), action, symptomId, ip);
  }, [userId, getUserName]);

  const logHealthyLiving = useCallback(async (action, articleId = null, ip = null) => {
    if (!userId) return false;
    return await logHealthyLivingActivity(userId, getUserName(), action, articleId, ip);
  }, [userId, getUserName]);

  const logUser = useCallback(async (action, targetUserId = null, ip = null) => {
    if (!userId) return false;
    return await logUserActivity(userId, getUserName(), action, targetUserId, ip);
  }, [userId, getUserName]);

  return {
    logActivity: logActivityAction,
    logAuth,
    logFacility,
    logDisease,
    logSymptom,
    logHealthyLiving,
    logUser
  };
};
