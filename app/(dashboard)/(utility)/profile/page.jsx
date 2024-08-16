"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/ui/Icon";
import Card from "@/components/ui/Card";
import { supabase } from "@/app/utils/supabaseClient";
import Loading from "@/components/Loading";
import moment from "moment";

const Profile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);

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
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchUserProfile();
  }, []);

  const handleImageUpload = async (event) => {
    console.log("File input change detected");
    setLoading(true);
    const file = event.target.files[0];
    const userId = localStorage.getItem("user_id");
  
    if (!file) {
      console.error("No file selected");
      setLoading(false);
      return;
    }
  
    console.log("File selected:", file);
    console.log("User ID:", userId);
  
    try {
      // Upload the image to Supabase Storage
      const { data, error } = await supabase.storage
        .from("avatar")
        .upload(`${file.name}`, file);
  
      if (error) {
        console.error("Error uploading image:", error);
        return;
      }
      console.log("Image uploaded successfully:", data);
  
      // Manually construct the public URL
      const avatar_url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/avatar/${file.name}`;
      console.log("Generated avatar URL:", avatar_url);
  
      // Update the profile with the new avatar URL
      const { error: updateError } = await supabase
        .from("user_profiles")
        .update({ avatar_url })
        .eq("id", userId);
  
      if (updateError) {
        console.error("Error updating profile image:", updateError);
      } else {
        console.log("Profile image updated successfully");
        setProfileData((prev) => ({ ...prev, avatar_url }));
      }
    } catch (error) {
      console.error("Unexpected error during upload:", error);
    } finally {
      setLoading(false);
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
      <div className="space-y-5 profile-page">
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
                    className="absolute right-2 h-8 w-8 bg-slate-50 text-slate-600 rounded-full shadow-sm flex flex-col items-center justify-center md:top-[140px] top-[100px] cursor-pointer"
                  >
                    <Icon icon="heroicons:pencil-square" />
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
    </div>
  );
};

export default Profile;
