"use client";
import { useEffect, useState } from "react";
import Icon from "@/components/ui/Icon";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Textinput from "@/components/ui/Textinput";
import Modal from "@/components/ui/Modal";
import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import moment from "moment";
import { toast } from "react-toastify";

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [editModal, setEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone_number: "",
    sex: "",
    dob: "",
  });
  
  // Password states
  const [passwordData, setPasswordData] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const userId = localStorage.getItem("user_id");
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", userId)
          .single();

        if (error) {
          console.error("Error fetching user profile:", error);
        } else {
          setProfileData(data);
          // Initialize form data
          setFormData({
            first_name: data.first_name || "",
            last_name: data.last_name || "",
            email: data.email || "",
            phone_number: data.phone_number || "",
            sex: data.sex || "",
            dob: data.dob ? moment(data.dob).format("YYYY-MM-DD") : "",
          });
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchUserProfile();
  }, []);


  const handleImageUpload = async (event) => {
    setLoading(true);
    const file = event.target.files[0];
    const userId = localStorage.getItem("user_id");

    if (!file) {
      console.error("No file selected");
      setLoading(false);
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      setLoading(false);
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size must be less than 5MB");
      setLoading(false);
      return;
    }

    try {
      // Generate unique filename to avoid conflicts
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}_${Date.now()}.${fileExt}`;

      console.log("Attempting to upload file:", fileName);

      // Upload the image to Supabase Storage
      const { data, error } = await supabase.storage
        .from("avatar")
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error("Error uploading image:", error);
        toast.error("Failed to upload image: " + (error.message || "Unknown error"));
        return;
      }

      console.log("Image uploaded successfully:", data);

      // Get the public URL from Supabase storage
      const { data: urlData } = supabase.storage
        .from("avatar")
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      console.log("Public URL generated:", publicUrl);

      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url: publicUrl })
        .eq("id", userId);

      if (updateError) {
        console.error("Error updating profile image:", updateError);
        toast.error("Failed to update profile");
      } else {
        setProfileData((prev) => ({ ...prev, avatar_url: publicUrl }));
        toast.success("Profile picture updated successfully!");
        
        // Clear the input so the same file can be selected again
        event.target.value = '';
      }
    } catch (error) {
      console.error("Unexpected error during upload:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    console.log('Input change:', name, value); // Debug log
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    console.log('Password change:', name, value); // Debug log
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleProfileUpdate = async () => {
    setEditLoading(true);
    const userId = localStorage.getItem("user_id");

    try {
      const { error } = await supabase
        .from("user_profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name,
          phone_number: formData.phone_number,
          sex: formData.sex,
          dob: formData.dob,
        })
        .eq("id", userId);

      if (error) {
        console.error("Error updating profile:", error);
        toast.error("Failed to update profile");
      } else {
        setProfileData(prev => ({
          ...prev,
          ...formData
        }));
        toast.success("Profile updated successfully!");
        setEditModal(false);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setEditLoading(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setPasswordLoading(true);
    const userId = localStorage.getItem("user_id");

    try {
      // First verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: profileData.email,
        password: passwordData.current_password,
      });

      if (signInError) {
        toast.error("Current password is incorrect");
        return;
      }

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: passwordData.new_password
      });

      if (error) {
        console.error("Error updating password:", error);
        toast.error("Failed to update password");
      } else {
        toast.success("Password updated successfully!");
        setPasswordData({
          current_password: "",
          new_password: "",
          confirm_password: "",
        });
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (!profileData) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-5 profile-page mt-5">
        <div className="profiel-wrap px-[35px] pb-10 md:pt-[84px] pt-10 rounded-lg bg-white dark:bg-slate-800 lg:flex lg:space-y-0 space-y-6 justify-between items-end relative z-[1]">
          <div className="bg-[#56ce84] dark:bg-slate-700 absolute left-0 top-0 md:h-1/2 h-[150px] w-full z-[-1] rounded-t-lg"></div>
          <div className="profile-box flex-none md:text-start text-center">
            <div className="md:flex items-end md:space-x-6 rtl:space-x-reverse">
              <div className="flex-none">
                <div className="md:h-[186px] md:w-[186px] h-[140px] w-[140px] md:ml-0 md:mr-0 ml-auto mr-auto md:mb-0 mb-4 rounded-full ring-4 ring-slate-100 relative">
                  <img
                    src={
                      profileData.avatar_url ||
                      "/assets/images/all-img/user.webp"
                    }
                    alt="User Avatar"
                    className="w-full h-full object-cover rounded-full"
                  />
                  <label
                    htmlFor="avatarUpload"
                    className={`absolute right-2 h-8 w-8 bg-slate-50 text-slate-600 rounded-full shadow-sm flex flex-col items-center justify-center md:top-[140px] top-[100px] cursor-pointer hover:bg-slate-100 transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-600"></div>
                    ) : (
                      <Icon icon="heroicons:pencil-square" />
                    )}
                  </label>
                  <input
                    type="file"
                    id="avatarUpload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={loading}
                  />
                </div>
              </div>
              <div className="flex-1">
                <div className="text-2xl font-medium text-slate-900 dark:text-slate-200 mb-[3px]">
                  {profileData.first_name || "N/A"} {profileData.last_name}
                </div>
                <div className="text-sm font-light text-slate-600 dark:text-slate-400 capitalize">
                  {profileData.role || "User Role"}
                </div>
                                 <div className="mt-4 space-y-2">
                   <Button
                     onClick={() => setEditModal(true)}
                     className="btn-primary flex items-center bg-[#56ce84] hover:bg-[#4bb874] text-white px-6 py-2 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                   >
                     <Icon icon="heroicons:pencil-square" className="mr-2" />
                     Edit Profile
                   </Button>
                 </div>
              </div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-12 gap-6">
          <div className="lg:col-span-12 col-span-12">
            <Card title="Info">
              <ul className="list space-y-8">
                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:envelope" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      EMAIL
                    </div>
                    <a
                      href={`mailto:${profileData.email}`}
                      className="text-base text-slate-600 dark:text-slate-50"
                    >
                      {profileData.email || "info@example.com"}
                    </a>
                  </div>
                </li>

                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="heroicons:phone-arrow-up-right" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      PHONE
                    </div>
                    <a
                      href={`tel:${profileData.phone_number}`}
                      className="text-base text-slate-600 dark:text-slate-50"
                    >
                      {profileData.phone_number || "+1-202-555-0151"}
                    </a>
                  </div>
                </li>

                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="icons8:gender-neutral-user" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      GENDER
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {profileData.sex || "N/A"}
                    </div>
                  </div>
                </li>

                <li className="flex space-x-3 rtl:space-x-reverse">
                  <div className="flex-none text-2xl text-slate-600 dark:text-slate-300">
                    <Icon icon="mingcute:birthday-2-line" />
                  </div>
                  <div className="flex-1">
                    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                      Date of Birth
                    </div>
                    <div className="text-base text-slate-600 dark:text-slate-50">
                      {profileData.dob
                        ? moment(profileData.dob).format("MM/DD/YYYY")
                        : "N/A"}
                    </div>
                  </div>
                </li>
              </ul>
            </Card>
          </div>
        </div>
      </div>

             {/* Edit Profile Modal */}
       <Modal
         title="Edit Profile"
         label="Edit Profile"
         className="max-w-2xl"
         activeModal={editModal}
         onClose={() => setEditModal(false)}
       >
      
        <div className="space-y-6">
          {/* Profile Information Section */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <Icon icon="heroicons:user-circle" className="mr-2 text-[#56ce84]" />
              Profile Information
            </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div className="space-y-2">
                 <label className="form-label">First Name</label>
                 <input
                   name="first_name"
                   type="text"
                   placeholder="Enter first name"
                   value={formData.first_name}
                   onChange={handleInputChange}
                   className="form-control w-full py-2"
                 />
               </div>
               <div className="space-y-2">
                 <label className="form-label">Last Name</label>
                 <input
                   name="last_name"
                   type="text"
                   placeholder="Enter last name"
                   value={formData.last_name}
                   onChange={handleInputChange}
                   className="form-control w-full py-2"
                 />
               </div>
               <div className="space-y-2">
                 <label className="form-label">Phone Number</label>
                 <input
                   name="phone_number"
                   type="tel"
                   placeholder="Enter phone number"
                   value={formData.phone_number}
                   onChange={handleInputChange}
                   className="form-control w-full py-2"
                 />
               </div>
               <div className="space-y-2">
                 <label className="form-label">Gender</label>
                 <select
                   name="sex"
                   value={formData.sex}
                   onChange={handleInputChange}
                   className="form-control w-full py-2"
                 >
                   <option value="">Select Gender</option>
                   <option value="Male">Male</option>
                   <option value="Female">Female</option>
                   <option value="Other">Other</option>
                 </select>
               </div>
               <div className="space-y-2">
                 <label className="form-label">Date of Birth</label>
                 <input
                   name="dob"
                   type="date"
                   value={formData.dob}
                   onChange={handleInputChange}
                   className="form-control w-full py-2"
                 />
               </div>
             </div>
            <div className="mt-6">
              <Button
                onClick={handleProfileUpdate}
                disabled={editLoading}
                className="btn-primary bg-[#56ce84] hover:bg-[#4bb874] text-white px-6 py-2 rounded-lg transition-all duration-200"
              >
                {editLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Icon icon="heroicons:check" className="mr-2" />
                    Update Profile
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Password Change Section */}
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4 flex items-center">
              <Icon icon="heroicons:lock-closed" className="mr-2 text-[#56ce84]" />
              Change Password
            </h3>
                         <div className="space-y-4">
               <div className="space-y-2">
                 <label className="form-label">Current Password</label>
                 <input
                   name="current_password"
                   type="password"
                   placeholder="Enter current password"
                   value={passwordData.current_password}
                   onChange={handlePasswordChange}
                   className="form-control w-full py-2"
                 />
               </div>
               <div className="space-y-2">
                 <label className="form-label">New Password</label>
                 <input
                   name="new_password"
                   type="password"
                   placeholder="Enter new password"
                   value={passwordData.new_password}
                   onChange={handlePasswordChange}
                   className="form-control w-full py-2"
                 />
               </div>
               <div className="space-y-2">
                 <label className="form-label">Confirm New Password</label>
                 <input
                   name="confirm_password"
                   type="password"
                   placeholder="Confirm new password"
                   value={passwordData.confirm_password}
                   onChange={handlePasswordChange}
                   className="form-control w-full py-2"
                 />
               </div>
             </div>
            <div className="mt-6">
              <Button
                onClick={handlePasswordUpdate}
                disabled={passwordLoading}
                className="btn-primary bg-[#56ce84] hover:bg-[#4bb874] text-white px-6 py-2 rounded-lg transition-all duration-200"
              >
                {passwordLoading ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating...
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Icon icon="heroicons:key" className="mr-2" />
                    Update Password
                  </div>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Profile;
