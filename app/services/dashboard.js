import moment from "moment";
import { supabase } from "../utils/supabaseClient";

export const fetchDAULast12Months = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const startDate = moment()
      .subtract(30, "days")
      .startOf("day")
      .format("YYYY-MM-DD");
    const endDate = moment().endOf("day").format("YYYY-MM-DD");

    // Fetch raw data from Supabase
    const { data, error } = await supabase
      .from("daily_active_users")
      .select("date, gender, user_id")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (error) {
      errorCallback(error);
      return;
    }

    // Group data by date and gender using JavaScript
    const groupedData = groupDataByDateAndGender(data);

    // Call the successCallback with the grouped data
    successCallback(groupedData);
  } catch (err) {
    errorCallback(err);
  }
};

// Helper function to group data by date and gender
const groupDataByDateAndGender = (data) => {
  // Initialize an empty object to store the grouped data
  const grouped = {};

  // Loop through the raw data and group by date and gender
  data.forEach((item) => {
    const { date, gender } = item;
    if (!grouped[date]) {
      grouped[date] = { male: 0, female: 0 }; // Initialize gender counts for each date
    }
    // Increment the gender count based on the data
    if (gender?.toLowerCase() === "male") {
      grouped[date].male += 1;
    } else if (gender?.toLowerCase() === "female") {
      grouped[date].female += 1;
    }
  });

  // Convert the grouped data object into an array for easier use in charts
  const groupedArray = Object.keys(grouped).map((date) => ({
    date,
    male: grouped[date].male,
    female: grouped[date].female,
  }));

  return groupedArray;
  // [
  //     { date: '2024-01-01', male: 120, female: 100 },
  //     { date: '2024-01-02', male: 150, female: 130 },
  //     { date: '2024-01-03', male: 180, female: 160 },
  //     { date: '2024-01-04', male: 170, female: 150 },
  // ]
};

export const fetchMAULast12Months = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const startMonth = moment().subtract(12, "months").format("YYYY-MM");
    const endMonth = moment().format("YYYY-MM");

    const { data, error } = await supabase
      .from("monthly_active_users")
      .select("month, gender, user_id")
      .gte("month", startMonth)
      .lte("month", endMonth)
      .order("month", { ascending: true });

    console.log("fetchMAULast12Months data", data);

    if (error) {
      errorCallback(error);
      return;
    }

    // Group data by date and gender using JavaScript
    const groupedData = groupDataByDateAndGenderMAU(data);

    console.log("fetchMAULast12Months groupedData", groupedData);

    // Call the successCallback with the grouped data
    successCallback(groupedData);
  } catch (err) {
    errorCallback(err);
  }
};

export const fetchDownloadsLast12Months = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const startMonth = moment()
      .subtract(11, "months")
      .startOf("month")
      .format("YYYY-MM-DD");
    const endMonth = moment().endOf("month").format("YYYY-MM-DD");

    const { data, error } = await supabase
      .from("downloads")
      .select("install_date, operating_system, user_id")
      .gte("install_date", startMonth)
      .lte("install_date", endMonth)
      .order("install_date", { ascending: true });

    if (error) {
      errorCallback(error);
      return;
    }

    // Group data by month and OS
    const groupedData = groupDataByMonthAndOS(data);

    successCallback(groupedData);
  } catch (err) {
    errorCallback(err);
  }
};

const groupDataByMonthAndOS = (data) => {
  // Initialize an empty object for grouped data
  const grouped = {};

  // Loop through data and group by month and OS
  data.forEach((item) => {
    const month = moment(item.install_date).format("YYYY-MM");
    if (!grouped[month]) {
      grouped[month] = { android: 0, ios: 0 };
    }
    if (item.operating_system?.toLowerCase() === "android") {
      grouped[month].android += 1;
    } else if (item.operating_system?.toLowerCase() === "ios") {
      grouped[month].ios += 1;
    }
  });

  // Convert grouped data to array format for charting
  return Object.keys(grouped).map((month) => ({
    month,
    android: grouped[month].android,
    ios: grouped[month].ios,
  }));
};


export const fetchAllDownloadsCount = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch the count of all records in the downloads table using exact count
    const { count, error } = await supabase
      .from("downloads")
      .select("*", { count: "exact", head: true });

    if (error) {
      errorCallback(error);
      return;
    }

    // The count of records
    const downloadsCount = count || 0;

    // Call the successCallback with the count of downloads
    successCallback(downloadsCount);
  } catch (err) {
    errorCallback(err);
  }
};

export const fetchTotalUsers = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch all users except Super Admin
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, role");

    console.log("Supabase user_profiles data:", data, error);

    if (error) {
      errorCallback(error);
      return;
    }

    if (!Array.isArray(data)) {
      errorCallback("Supabase returned non-array data");
      return;
    }

    // Filter out Super Admin users
    const filteredUsers = data.filter(user => user.role !== "Super Admin");
    const totalUsers = filteredUsers.length;

    // Construct the result object
    const result = {
      totalUsers,
    };

    // Call the successCallback with the result object
    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// export const fetchTotalUsers = async (
//   loadCallback,
//   successCallback,
//   errorCallback
// ) => {
//   loadCallback();

//   try {
//     // Fetch the count of all users and count males and females
//     const { data, error } = await supabase.from("user_profiles").select("sex");
//         console.log("Supabase user_profiles data:", data, error);

//     if (error) {
//       errorCallback(error);
//       return;
//     }

//     // Initialize counters for males and females
//     let males = 0;
//     let females = 0;

//     // Iterate through the data and count the males and females
//     data.forEach((user) => {
//       if (user.sex === "Male") {
//         males++;
//       } else if (user.sex === "Female") {
//         females++;
//       }
//     });

//     // Total users count is the sum of males and females
//     const totalUsers = males + females;

//     // Construct the result object
//     const result = {
//       totalUsers,
//       males,
//       females,
//     };

//     // Call the successCallback with the result object
//     successCallback(result);
//   } catch (err) {
//     errorCallback(err);
//   }
// };

const groupDataByDateAndGenderMAU = (data) => {
  // Initialize an empty object to store the grouped data
  const grouped = {};

  // Loop through the raw data and group by date and gender
  data.forEach((item) => {
    const { month, gender } = item;
    if (!grouped[month]) {
      grouped[month] = { male: 0, female: 0 }; // Initialize gender counts for each date
    }
    // Increment the gender count based on the data
    if (gender?.toLowerCase() === "male") {
      grouped[month].male += 1;
    } else if (gender?.toLowerCase() === "female") {
      grouped[month].female += 1;
    }
  });

  // Convert the grouped data object into an array for easier use in charts
  const groupedArray = Object.keys(grouped).map((month) => ({
    month,
    male: grouped[month].male,
    female: grouped[month].female,
  }));

  return groupedArray;
  // [
  //     { date: '2024-01-01', male: 120, female: 100 },
  //     { date: '2024-01-02', male: 150, female: 130 },
  //     { date: '2024-01-03', male: 180, female: 160 },
  //     { date: '2024-01-04', male: 170, female: 150 },
  // ]
};

const groupDataByDateAndOS = (data) => {
  // Initialize an empty object to store the grouped data
  const grouped = {};

  // Loop through the raw data and group by date and gender
  data.forEach((item) => {
    const { month, operating_system } = item;
    if (!grouped[month]) {
      grouped[month] = { android: 0, ios: 0 }; // Initialize gender counts for each date
    }
    // Increment the gender count based on the data
    if (operating_system?.toLowerCase() === "android") {
      grouped[month].android += 1;
    } else if (operating_system?.toLowerCase() === "ios") {
      grouped[month].ios += 1;
    }
  });

  // Convert the grouped data object into an array for easier use in charts
  const groupedArray = Object.keys(grouped).map((month) => ({
    month,
    android: grouped[month].android,
    ios: grouped[month].ios,
  }));

  return groupedArray;
  // [
  //     { date: '2024-01-01', male: 120, female: 100 },
  //     { date: '2024-01-02', male: 150, female: 130 },
  //     { date: '2024-01-03', male: 180, female: 160 },
  //     { date: '2024-01-04', male: 170, female: 150 },
  // ]
};

// New function to fetch total facilities count
export const fetchTotalFacilities = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch total count
    const { count: totalCount, error: totalError } = await supabase
      .from("facility_profile")
      .select("*", { count: "exact", head: true });

    if (totalError) {
      errorCallback(totalError);
      return;
    }

    // Fetch approved count
    const { count: approvedCount, error: approvedError } = await supabase
      .from("facility_profile")
      .select("*", { count: "exact", head: true })
      .eq("status", "Approved");

    if (approvedError) {
      errorCallback(approvedError);
      return;
    }

    // Fetch pending count
    const { count: pendingCount, error: pendingError } = await supabase
      .from("facility_profile")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending");

    if (pendingError) {
      errorCallback(pendingError);
      return;
    }

    const result = {
      totalFacilities: totalCount || 0,
      approvedCount: approvedCount || 0,
      pendingCount: pendingCount || 0,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total specialists count
export const fetchTotalSpecialists = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch the count of all specialists from illness_and_conditions table
    const { data, error } = await supabase
      .from("illness_and_conditions")
      .select("id, specialist_to_contact");

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total specialists (conditions that have specialist_to_contact)
    let totalSpecialists = 0;
    let uniqueSpecialists = new Set();

    data.forEach((condition) => {
      if (condition.specialist_to_contact) {
        totalSpecialists++;
        uniqueSpecialists.add(condition.specialist_to_contact);
      }
    });

    const result = {
      totalSpecialists: uniqueSpecialists.size, // Count unique specialists
      totalConditions: totalSpecialists, // Total conditions with specialists
    };

    successCallback(result);
    console.log("fetchTotalSpecialists result", result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total facility visits count (placeholder since table doesn't exist)
export const fetchTotalFacilityVisits = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Since facility_visits table doesn't exist, we'll return a placeholder
    // You can replace this with actual logic when you have the table
    const result = {
      totalVisits: 0,
      currentMonthVisits: 0,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total diseases and conditions count
export const fetchTotalDiseasesAndConditions = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch the count of all diseases and conditions using exact count
    const { count, error } = await supabase
      .from("illness_and_conditions")
      .select("*", { count: "exact", head: true });

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total diseases and conditions
    const totalDiseasesAndConditions = count || 0;

    const result = {
      totalDiseasesAndConditions,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total symptoms count
export const fetchTotalSymptoms = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch the count of all symptoms using exact count
    const { count, error } = await supabase
      .from("symptoms")
      .select("*", { count: "exact", head: true });

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total symptoms
    const totalSymptoms = count || 0;

    const result = {
      totalSymptoms,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total healthy living count
export const fetchTotalHealthyLiving = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch the count of all healthy living articles using exact count
    const { count, error } = await supabase
      .from("healthy_living")
      .select("*", { count: "exact", head: true });

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total healthy living articles
    const totalHealthyLiving = count || 0;

    const result = {
      totalHealthyLiving,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total online users count
export const fetchTotalOnlineUsers = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch users who have been active in the last 24 hours
    const last24Hours = moment().subtract(24, "hours").valueOf();
    
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, last_activity, sex")
      .gte("last_activity", last24Hours.toString());

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total online users by gender
    let totalOnlineUsers = 0;
    let males = 0;
    let females = 0;

    data.forEach((user) => {
      totalOnlineUsers++;
      if (user.sex === "Male") {
        males++;
      } else if (user.sex === "Female") {
        females++;
      }
    });

    const result = {
      totalOnlineUsers,
      males,
      females,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total medication reminder users count
export const fetchTotalMedicationReminderUsers = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch users who have medication reminders from the medication_reminders table
    const { data, error } = await supabase
      .from("medication_reminders")
      .select(`
        id,
        user_id,
        user_profiles!inner(sex)
      `);

    if (error) {
      errorCallback(error);
      return;
    }

    // Count unique users who have medication reminders by gender
    const uniqueUsers = new Set();
    let totalMedicationReminderUsers = 0;
    let males = 0;
    let females = 0;

    data.forEach((reminder) => {
      if (!uniqueUsers.has(reminder.user_id)) {
        uniqueUsers.add(reminder.user_id);
        totalMedicationReminderUsers++;
        
        if (reminder.user_profiles?.sex === "Male") {
          males++;
        } else if (reminder.user_profiles?.sex === "Female") {
          females++;
        }
      }
    });

    const result = {
      totalMedicationReminderUsers,
      males,
      females,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch total period tracker users count
export const fetchTotalPeriodTrackerUsers = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch total count of tracker logs using exact count
    const { count, error } = await supabase
      .from("tracker_logs")
      .select("*", { count: "exact", head: true });

    if (error) {
      errorCallback(error);
      return;
    }

    // Get the total count of tracker logs
    const totalPeriodTrackerUsers = count || 0;

    const result = {
      totalPeriodTrackerUsers,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

export const fetchDashboardOverviewStats = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();
  try {
    const { data, error } = await supabase.rpc("get_admin_dashboard_stats");

    if (error) {
      errorCallback(error);
      return;
    }

    successCallback(data);
  } catch (err) {
    errorCallback(err);
  }
};

// New function to fetch marketing breakdown by banner types from banners_ads table
export const fetchTotalMarketing = async (
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Fetch all banners with their types
    const { data, error } = await supabase
      .from("banners_ads")
      .select("id, banner_type");

    if (error) {
      errorCallback(error);
      return;
    }

    // Count banners by type
    const bannerTypeCounts = {};
    data.forEach((banner) => {
      const type = banner.banner_type || "unknown";
      bannerTypeCounts[type] = (bannerTypeCounts[type] || 0) + 1;
    });

    // Get counts for each banner type
    const health = bannerTypeCounts["health"] || 0;
    const ads = bannerTypeCounts["ads"] || 0;
    const event = bannerTypeCounts["event"] || 0;
    const news = bannerTypeCounts["news"] || 0;
    const marketing = bannerTypeCounts["marketing"] || 0;

    const result = {
      health,
      ads,
      event,
      news,
      marketing,
      totalMarketing: Object.values(bannerTypeCounts).reduce((sum, count) => sum + count, 0),
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Time-based filtering functions

// Helper function to get date range based on period for bigint fields (Unix timestamp)
const getDateRangeBigint = (period) => {
  const now = moment();
  
  switch (period) {
    case "weekly":
      return {
        start: now.clone().subtract(7, "days").startOf("day").valueOf().toString(),
        end: now.endOf("day").valueOf().toString(),
      };
    case "monthly":
      return {
        start: now.clone().subtract(1, "month").startOf("day").valueOf().toString(),
        end: now.endOf("day").valueOf().toString(),
      };
    case "yearly":
      return {
        start: now.clone().subtract(1, "year").startOf("day").valueOf().toString(),
        end: now.endOf("day").valueOf().toString(),
      };
    default:
      return {
        start: now.clone().subtract(1, "month").startOf("day").valueOf().toString(),
        end: now.endOf("day").valueOf().toString(),
      };
  }
};

// Helper function to get date range based on period for timestamptz fields
const getDateRangeTimestamptz = (period) => {
  const now = moment();
  
  switch (period) {
    case "weekly":
      return {
        start: now.clone().subtract(7, "days").startOf("day").toISOString(),
        end: now.endOf("day").toISOString(),
      };
    case "monthly":
      return {
        start: now.clone().subtract(1, "month").startOf("day").toISOString(),
        end: now.endOf("day").toISOString(),
      };
    case "yearly":
      return {
        start: now.clone().subtract(1, "year").startOf("day").toISOString(),
        end: now.endOf("day").toISOString(),
      };
    default:
      return {
        start: now.clone().subtract(1, "month").startOf("day").toISOString(),
        end: now.endOf("day").toISOString(),
      };
  }
};

// Helper function to get date range based on period for text date fields
const getDateRangeText = (period) => {
  const now = moment();
  
  switch (period) {
    case "weekly":
      return {
        start: now.clone().subtract(7, "days").startOf("day").format("YYYY-MM-DD"),
        end: now.endOf("day").format("YYYY-MM-DD"),
      };
    case "monthly":
      return {
        start: now.clone().subtract(1, "month").startOf("day").format("YYYY-MM-DD"),
        end: now.endOf("day").format("YYYY-MM-DD"),
      };
    case "yearly":
      return {
        start: now.clone().subtract(1, "year").startOf("day").format("YYYY-MM-DD"),
        end: now.endOf("day").format("YYYY-MM-DD"),
      };
    default:
      return {
        start: now.clone().subtract(1, "month").startOf("day").format("YYYY-MM-DD"),
        end: now.endOf("day").format("YYYY-MM-DD"),
      };
  }
};

// Fetch downloads count by time period
export const fetchDownloadsCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeText(period); // downloads.install_date is text
    
    const { count, error } = await supabase
      .from("downloads")
      .select("*", { count: "exact", head: true })
      .gte("install_date", start)
      .lte("install_date", end);

    if (error) {
      errorCallback(error);
      return;
    }

    const downloadsCount = count || 0;
    successCallback(downloadsCount);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch users count by time period (users created in the period)
export const fetchUsersCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeBigint(period); // user_profiles.created_at is bigint
    
    const { data, error } = await supabase
      .from("user_profiles")
      .select("sex, created_at")
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) {
      errorCallback(error);
      return;
    }

    let males = 0;
    let females = 0;

    data.forEach((user) => {
      if (user.sex === "Male") {
        males++;
      } else if (user.sex === "Female") {
        females++;
      }
    });

    const totalUsers = males + females;

    const result = {
      totalUsers,
      males,
      females,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch facilities count by time period (facilities created in the period)
export const fetchFacilitiesCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeTimestamptz(period); // facility_profile.created_at is timestamptz
    
    // Fetch total count
    const { count: totalCount, error: totalError } = await supabase
      .from("facility_profile")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    if (totalError) {
      errorCallback(totalError);
      return;
    }

    // Fetch approved count
    const { count: approvedCount, error: approvedError } = await supabase
      .from("facility_profile")
      .select("*", { count: "exact", head: true })
      .eq("status", "Approved")
      .gte("created_at", start)
      .lte("created_at", end);

    if (approvedError) {
      errorCallback(approvedError);
      return;
    }

    // Fetch pending count
    const { count: pendingCount, error: pendingError } = await supabase
      .from("facility_profile")
      .select("*", { count: "exact", head: true })
      .eq("status", "Pending")
      .gte("created_at", start)
      .lte("created_at", end);

    if (pendingError) {
      errorCallback(pendingError);
      return;
    }

    const result = {
      totalFacilities: totalCount || 0,
      approvedCount: approvedCount || 0,
      pendingCount: pendingCount || 0,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch specialists count by time period (specialists added in the period)
export const fetchSpecialistsCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeBigint(period); // illness_and_conditions.created_at is bigint
    
    const { data, error } = await supabase
      .from("illness_and_conditions")
      .select("id, created_at")
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) {
      errorCallback(error);
      return;
    }

    let totalSpecialists = 0;
    let uniqueSpecialists = new Set();

    data.forEach((condition) => {
      if (condition.specialist_to_contact) {
        totalSpecialists++;
        uniqueSpecialists.add(condition.specialist_to_contact);
      }
    });

    const result = {
      totalSpecialists: uniqueSpecialists.size,
      totalConditions: totalSpecialists,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch diseases and conditions count by time period
export const fetchDiseasesCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeBigint(period); // illness_and_conditions.created_at is bigint
    
    const { count, error } = await supabase
      .from("illness_and_conditions")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) {
      errorCallback(error);
      return;
    }

    const totalDiseasesAndConditions = count || 0;

    const result = {
      totalDiseasesAndConditions,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch symptoms count by time period
export const fetchSymptomsCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeBigint(period); // symptoms.created_at is bigint
    
    const { count, error } = await supabase
      .from("symptoms")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) {
      errorCallback(error);
      return;
    }

    const totalSymptoms = count || 0;

    const result = {
      totalSymptoms,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch healthy living count by time period
export const fetchHealthyLivingCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeBigint(period); // healthy_living.created_at is bigint
    
    const { count, error } = await supabase
      .from("healthy_living")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) {
      errorCallback(error);
      return;
    }

    const totalHealthyLiving = count || 0;

    const result = {
      totalHealthyLiving,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch online users count by time period (users active in the period)
export const fetchOnlineUsersCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeBigint(period); // user_profiles.last_activity is likely bigint
    
    const { data, error } = await supabase
      .from("user_profiles")
      .select("user_id, last_activity, sex")
      .gte("last_activity", start)
      .lte("last_activity", end);

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total online users by gender
    let totalOnlineUsers = 0;
    let males = 0;
    let females = 0;

    data.forEach((user) => {
      totalOnlineUsers++;
      if (user.sex === "Male") {
        males++;
      } else if (user.sex === "Female") {
        females++;
      }
    });

    const result = {
      totalOnlineUsers,
      males,
      females,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch medication reminder users count by time period
export const fetchMedicationReminderUsersCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeTimestamptz(period); // medication_reminders.start_date is timestamptz
    
    const { data, error } = await supabase
      .from("medication_reminders")
      .select(`
        id,
        user_id,
        start_date,
        user_profiles!inner(sex)
      `)
      .gte("start_date", start)
      .lte("start_date", end);

    if (error) {
      errorCallback(error);
      return;
    }

    // Count unique users who have medication reminders within the time period by gender
    const uniqueUsers = new Set();
    let totalMedicationReminderUsers = 0;
    let males = 0;
    let females = 0;
    
    data.forEach((reminder) => {
      if (!uniqueUsers.has(reminder.user_id)) {
        uniqueUsers.add(reminder.user_id);
        totalMedicationReminderUsers++;
        
        if (reminder.user_profiles?.sex === "Male") {
          males++;
        } else if (reminder.user_profiles?.sex === "Female") {
          females++;
        }
      }
    });

    const result = {
      totalMedicationReminderUsers,
      males,
      females,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

// Fetch period tracker users count by time period
export const fetchPeriodTrackerUsersCountByPeriod = async (
  period,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    const { start, end } = getDateRangeBigint(period); // Assuming tracker_logs has created_at as bigint
    
    const { count, error } = await supabase
      .from("tracker_logs")
      .select("*", { count: "exact", head: true })
      .gte("created_at", start)
      .lte("created_at", end);

    if (error) {
      errorCallback(error);
      return;
    }

    // Get the total count of tracker logs within the time period
    const totalPeriodTrackerUsers = count || 0;

    const result = {
      totalPeriodTrackerUsers,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};