import { supabase } from "../utils/supabaseClient";

export const healthcareProfile = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Check if the user is authenticated using localStorage
    const isAuthenticated = localStorage.getItem('isAuth') === 'true';
    const userId = localStorage.getItem('user_id');

    if (!isAuthenticated || !userId) {
      console.error("User is not authenticated");
      errorCallback(new Error("User is not authenticated"));
      return;
    }

    // Proceed with inserting data into the healthcare_profiles table
    const { data: insertData, error: healthcareProfileError } = await supabase
      .from("healthcare_profiles")
      .insert([
        {
          facility_type: user.facility_type,
          unique_id: user.unique_id,
          facility_name: user.facility_name,
          contact_num: user.contact_num,
          whatsapp: user.whatsapp,
          gps_address: user.gps_address,
          street: user.street,
          post_code: user.post_code,
          area: user.area,
          district: user.district,
          region: user.region,
          country: user.country,
          hospital_services: user.hospital_services,
          hospital_amenities: user.hospital_amenities,
          pharmacy_services: user.pharmacy_services,
          status: "Active",
          created_at: new Date().toISOString(),
        },
      ]);

    if (healthcareProfileError) {
      errorCallback(healthcareProfileError);
      return;
    }

    successCallback(insertData);
  } catch (err) {
    errorCallback(err);
  }
};
