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


  
  export const sendOtpToEmail = async (
    email,
    loadCallback,
    successCallback,
    errorCallback,
  ) => {
    loadCallback();
    try {
      const {data: userProfile, error: fetchError} = await supabase
        .from('user_profiles')
        .select('*')
        .eq('email', email)
        .single();
      if (!userProfile) {
        return errorCallback(new Error('User not found'));
      }
      const {data, error} = await supabase.auth.signInWithOtp({
        email,
        options: {
          // set this to false if you do not want the user to be automatically signed up
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
  
  export const verifyOtpSentToEmail = async (
    email,
    otp,
    loadCallback,
    successCallback,
    errorCallback,
  ) => {
    loadCallback();
    try {
      const {data, error} = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: 'email',
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
  
  export const resetPassword = async (
    newPassword,
    phoneOrEmail,
    loadCallback,
    successCallback,
    errorCallback,
  )=> {
    loadCallback();
    try {
      let emailOrPhone = phoneOrEmail;
      let decryptedPassword = '';
      // Fetch user profile based on phone or email
      if (!emailOrPhone.includes('@')) {
        const {data: userProfileByPhone, error: phoneFetchError} = await supabase
          .from('user_profiles')
          .select('*')
          .eq('phone_number', `+${emailOrPhone}`)
          .single();
        if (!userProfileByPhone?.email) {
          errorCallback(new Error('No user found with the given phone number.'));
          return;
        }
        emailOrPhone = userProfileByPhone.email;
        decryptedPassword = decryptedPassword(userProfileByPhone?.password);
      }
      if (emailOrPhone.includes('@')) {
        const {data: userProfileByEmail, error: emailFetchError} = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', emailOrPhone)
          .single();
        if (!userProfileByEmail?.email) {
          errorCallback(new Error('User not found'));
          return;
        }
        emailOrPhone = userProfileByEmail.email;
        decryptedPassword = decryptPassword(userProfileByEmail?.password);
      }
      // Sign in the user with the decrypted password
      const {data: signinData, error: signinError} =
        await supabase.auth.signInWithPassword({
          email: emailOrPhone,
          password: decryptedPassword,
        });
      if (signinError) {
        errorCallback(signinError);
        return;
      }
      // Update the password in the auth system
      const {data, error} = await supabase.auth.updateUser({
        email: emailOrPhone,
        password: newPassword,
      });
      if (error) {
        errorCallback(error);
        return;
      }
      // Update the password field in the user_profiles table
      const {data: updateProfileData, error: updateProfileError} = await supabase
        .from('user_profiles')
        .update({password: encryptPassword(newPassword)})
        .eq('email', emailOrPhone);
      if (updateProfileError) {
        errorCallback(updateProfileError);
      } else {
        successCallback(data);
      }
    } catch (err) {
      errorCallback(err);
    }
  };
  