import moment from "moment";
import { supabase } from "../utils/supabaseClient";

export const add_symptoms = async (
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
      .from("symptoms")
      .insert([
        {
          created_at: moment(new Date()).valueOf(), // Convert date to timestamp
          updated_at: moment(new Date()).valueOf(), // Convert date to timestamp
          created_by: userId,
          updated_by: userId,
          is_created_by_admin_panel: true,
          symptom_name: user.symptom_name,
          list_type: user.list_type,
          about: user.about,
          types: JSON.stringify(user.types),
          causes: JSON.stringify(user.causes),
          diagnosis: user.diagnosis,
          treating: user.treating,
          complications: user.complications,
          prevention: user.prevention,
          specialist_to_contact: user.specialist_to_contact,
          contact_your_doctor: user.contact_your_doctor,
          more_information: user.more_information,
          attribution: user.attribution,
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
