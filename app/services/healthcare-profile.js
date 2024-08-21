import { encryptPassword } from "../utils/helpers";
import { supabase } from "../utils/supabaseClient";
import moment from "moment";

export const healthcareProfile = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();
  try {
    const { data: insertData, error } = await supabase
      .from("healthcare_profiles")
      .insert([
        {
          facility_type: user.facility_type,
          unique_id: user.unique_id,
          facility_name: user.facility_name,
          contact_num: user.contact_num,
          whatsapp: user.whatsapp,
          location: user.location,
          digital_address: user.digital_address,
          address: user.address,
          city: user.city,
          region: user.region,
          hospital_services: user.hospital_services,
          hospital_amenities: user.hospital_amenities,
          pharmacy_services: user.pharmacy_services,
          status: user.status,
          created_at: moment().toISOString(),
        },
      ]);

    if (error) {
      errorCallback(error);
      return;
    }

    const userId = insertData[0]?.id;
    if (userId) {
      const encryptedPassword = encryptPassword(user.password);
      const updatedUser = { ...user, password: encryptedPassword };

      const { error: updateError } = await supabase
        .from("user_profiles")
        .insert([
          {
            id: userId,
            password: encryptedPassword,
            created_at: moment().unix(),
            updated_at: moment().unix(),
            created_by: userId,
            updated_by: userId,
            is_created_by_admin_panel: false,
            ...updatedUser,
          },
        ]);

      if (updateError) {
        errorCallback(updateError);
        return;
      }

      successCallback(insertData);
    } else {
      errorCallback(new Error("User ID is not available."));
    }
  } catch (err) {
    errorCallback(err);
  }
};
