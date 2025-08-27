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
    // Fetch the count of all records in the downloads table
    const { data, error } = await supabase.from("downloads").select("*");

    if (error) {
      errorCallback(error);
      return;
    }

    // The count of records is stored in the data.count property
    const downloadsCount = data?.length || 0;

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
    // Fetch the count of all users and count males and females
    const { data, error } = await supabase.from("user_profiles").select("sex");

    if (error) {
      errorCallback(error);
      return;
    }

    // Initialize counters for males and females
    let males = 0;
    let females = 0;

    // Iterate through the data and count the males and females
    data.forEach((user) => {
      if (user.sex === "Male") {
        males++;
      } else if (user.sex === "Female") {
        females++;
      }
    });

    // Total users count is the sum of males and females
    const totalUsers = males + females;

    // Construct the result object
    const result = {
      totalUsers,
      males,
      females,
    };

    // Call the successCallback with the result object
    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};

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
    // Fetch the count of all healthcare facilities
    const { data, error } = await supabase
      .from("healthcare_profiles")
      .select("id, status");

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total facilities
    const totalFacilities = data?.length || 0;

    // Count approved and pending facilities
    let approvedCount = 0;
    let pendingCount = 0;

    data.forEach((facility) => {
      if (facility.status === "Approved") {
        approvedCount++;
      } else if (facility.status === "Pending") {
        pendingCount++;
      }
    });

    const result = {
      totalFacilities,
      approvedCount,
      pendingCount,
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
    // Fetch the count of all diseases and conditions
    const { data, error } = await supabase
      .from("illness_and_conditions")
      .select("id");

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total diseases and conditions
    const totalDiseasesAndConditions = data?.length || 0;

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
    // Fetch the count of all symptoms
    const { data, error } = await supabase
      .from("symptoms")
      .select("id");

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total symptoms
    const totalSymptoms = data?.length || 0;

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
    // Fetch the count of all healthy living articles
    const { data, error } = await supabase
      .from("healthy_living")
      .select("id");

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total healthy living articles
    const totalHealthyLiving = data?.length || 0;

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
      .select("id, last_activity")
      .gte("last_activity", last24Hours.toString());

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total online users
    const totalOnlineUsers = data?.length || 0;

    const result = {
      totalOnlineUsers,
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
    // Fetch users who have medication reminders enabled
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, is_tracker_notifications_enabled")
      .eq("is_tracker_notifications_enabled", true);

    if (error) {
      errorCallback(error);
      return;
    }

    // Count total medication reminder users
    const totalMedicationReminderUsers = data?.length || 0;

    const result = {
      totalMedicationReminderUsers,
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
    // Fetch users who have period tracker enabled (assuming there's a field for this)
    // For now, we'll count users who have period tracker data or are female users
    const { data, error } = await supabase
      .from("user_profiles")
      .select("id, sex, is_tracker_notifications_enabled");

    if (error) {
      errorCallback(error);
      return;
    }

    // Count users who are female and have tracker notifications enabled
    // This is a reasonable assumption for period tracker users
    let totalPeriodTrackerUsers = 0;
    
    data.forEach((user) => {
      if (user.sex === "Female" && user.is_tracker_notifications_enabled) {
        totalPeriodTrackerUsers++;
      }
    });

    const result = {
      totalPeriodTrackerUsers,
    };

    successCallback(result);
  } catch (err) {
    errorCallback(err);
  }
};