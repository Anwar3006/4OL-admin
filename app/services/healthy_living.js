import moment from "moment";
import { supabase } from "../utils/supabaseClient";

export const add_healthy_living = async (
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

    // Proceed with inserting data into the healthcare_profiles table
    const dataToInsert = {
      // created_at: moment(Date.now()).valueOf(), // Convert date to timestamp //we let the database handle the timestamps
      // updated_at: moment(Date.now()).valueOf(), // Convert date to timestamp
      created_by: userId,
      updated_by: userId,
      is_created_by_admin_panel: true,
      topic_name: user.topic_name,
      list_type: user.list_type,
      category: user.category,
      about: user.about,

      types: user.types, //array of objects, stored as jsonb in database

      contact_your_doctor: user.contact_your_doctor,
      more_information: user.more_information,
      attribution: user.attribution,
      image_url: user.image_url,
    };
    console.log("Data to insert: ", dataToInsert);
    const { data: insertData, error: healthcareProfileError } = await supabase
      .from("healthy_living")
      .insert([dataToInsert]);

    if (healthcareProfileError) {
      errorCallback(healthcareProfileError);
      return;
    }

    successCallback(insertData);
  } catch (err) {
    errorCallback(err);
  }
};
