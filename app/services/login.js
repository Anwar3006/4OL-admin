import { encryptPassword } from "../utils/helpers";
import { supabase } from "../utils/supabaseClient";

export const login = async (user, loadCallback, successCallback, errorCallback) => {
    loadCallback();
    try {
        let emailOrPhone = user.emailOrPhone;
        console.log('Attempting to login with:', emailOrPhone);

        if (!emailOrPhone.includes('@')) {
            const { data: userProfileByPhone, error: phoneFetchError } = await supabase
                .from('user_profiles')
                .select('email')
                .eq('phone_number', `+${emailOrPhone}`)
                .single();
            if (phoneFetchError || !userProfileByPhone?.email) {
                console.error('Error fetching user by phone:', phoneFetchError);
                errorCallback(new Error('No user found with the given phone number.'));
                return;
            }
            emailOrPhone = userProfileByPhone.email;
        }

        const { data: signinData, error: signinError } = await supabase.auth.signInWithPassword({
            email: emailOrPhone,
            password: user.passcode,
        });
        console.log('Signin data:', signinData);
        if (signinError) {
            console.error('Sign-in error:', signinError);
            errorCallback(signinError);
            return;
        }

        // Await the session to get the result
        const { data: session, error: sessionError } = await supabase.auth.getSession();
        if (sessionError) {
            console.error('Error fetching session:', sessionError);
            errorCallback(sessionError);
            return;
        }
        console.log('Session:', session);

        const userId = signinData.user?.id;
        if (userId) {
            const { data: userProfile, error: fetchError } = await supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();
            console.log('User profile:', userProfile);
            if (fetchError) {
                console.error('Error fetching user profile:', fetchError);
                errorCallback(fetchError);
                return;
            }
            localStorage.setItem('user_id', userId);
            successCallback(userProfile);
        } else {
            errorCallback(new Error('User ID is not available.'));
        }
    } catch (err) {
        console.error('Unexpected error:', err);
        if (typeof errorCallback === 'function') {
            errorCallback(err);
        } else {
            console.error('Error callback is not a function');
        }
    }
};



export const logout = async (
    loadCallback,
    successCallback,
    errorCallback
) => {
    try {
        loadCallback();
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
            errorCallback(signOutError);
            return;
        }
        localStorage.removeItem('user_id'); // Ensure localStorage is used
        successCallback();
    } catch (err) {
        errorCallback(err);
    }
};


  
export const sendOtpToEmail = async (email, loadCallback, successCallback, errorCallback) => {
    loadCallback();
    try {
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: false,
        },
      });
  
      if (error) {
        errorCallback(error);
      } else {
        successCallback(data);
      }
    } catch (err) {
      errorCallback(err);
    }
  };
  
  
  export const verifyOtpSentToEmail = async (email, otp) => {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
      });
      if (error) {
        throw error;
      }
      
      // Save token and email in localStorage
      localStorage.setItem('token', otp);
      localStorage.setItem('email', email);
  
      return data;
    } catch (err) {
      console.error("OTP Verification Error:", err);
      throw err;
    }
  };
  
  
  
  
  
  export const resetPassword = async (newPassword, successCallback, errorCallback) => {
    try {
        // Directly update the password
        const { data, error } = await supabase.auth.updateUser({
            password: newPassword,
        });

        if (error) {
            console.error("Password Update Failed:", error);
            errorCallback(error);
            return;
        }

        console.log("Password Update Successful:", data);
        successCallback();
    } catch (err) {
        console.error("Unexpected Error During Password Reset:", err);
        errorCallback(err);
    }
};


  
  
  
  

  