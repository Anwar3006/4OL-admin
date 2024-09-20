import moment from "moment";
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
          created_at: moment(new Date()).valueOf(), // Convert date to timestamp
          updated_at: moment(new Date()).valueOf(), // Convert date to timestamp
          created_by: userId,
          updated_by: userId,
          is_created_by_admin_panel: false,
          facility_type: user.facility_type,
          facility_name: user.facility_name,
          contact_num: user.contact_num,
          whatsapp: user.whatsapp,
          email: user.email,
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
          first_name: user.first_name,
          last_name: user.last_name,
          person_contact_number: user.persn_contact_number,
          position: user.position,
          status: "Active",
          business_hours: user.business_hours,
          mediaUrls: user.mediaUrls,
          
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
