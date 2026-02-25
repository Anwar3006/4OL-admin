import moment from "moment";
import { supabase } from "../utils/supabaseClient";

export const add_illness_and_condition = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();

  try {
    // Check if the user is authenticated using localStorage
    const isAuthenticated = localStorage.getItem("isAuth") === "true";
    const userId = localStorage.getItem("user_id");

    if (!isAuthenticated || !userId) {
      console.error("User is not authenticated");
      errorCallback(new Error("User is not authenticated"));
      return;
    }

    // Proceed with inserting data into the facility_profile table
    const { data: insertData, error: healthcareProfileError } = await supabase
      .from("illness_and_conditions")
      .insert([
        {
          created_at: moment(new Date()).valueOf(), // Convert date to timestamp
          updated_at: moment(new Date()).valueOf(), // Convert date to timestamp
          created_by: userId,
          updated_by: userId,
          is_created_by_admin_panel: true,
          condition_name: user.condition_name,
          list_type: user.list_type,
          about: user.about,
          types: user.types,
          causes: user.causes,
          diagnosis: user.diagnosis,
          treating: user.treating,
          complications: user.complications,
          symptoms: user.symptoms,
          prevention: user.prevention,
          specialist_to_contact: user.specialist_to_contact,
          contact_your_doctor: user.contact_your_doctor,
          more_information: user.more_information,
          attribution: user.attribution,
          image_url: user.image_url,
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
