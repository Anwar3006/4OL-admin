import { encryptPassword } from "../utils/helpers";
import { supabase } from "../utils/supabaseClient";
import moment from "moment";

export const signup = async (
  user,
  loadCallback,
  successCallback,
  errorCallback
) => {
  loadCallback();
  try {
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: user.email,
      password: user.password,
    });

    if (signupError) {
      errorCallback(signupError);
      return;
    }

    const userId = signupData.user?.id;
    if (userId) {
      const encryptedPassword = encryptPassword(user.password);
      const updatedUser = { ...user };
      delete updatedUser['confirm_password'];
      delete updatedUser['password'];

      const { error: updateError } = await supabase.from('user_profiles').insert([
        {
          id: userId,
          password: encryptedPassword,
          created_at: new Date().getTime(), // Convert date to timestamp
          updated_at: new Date().getTime(), // Convert date to timestamp
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

      successCallback(signupData);
    } else {
      errorCallback(new Error('User ID is not available.'));
    }
  } catch (err) {
    errorCallback(err);
  }
};
