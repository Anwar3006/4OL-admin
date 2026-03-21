"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";
import Loading from "@/components/Loading";
import moment from "moment";
import { useSearchParams } from "next/navigation";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { toast } from "react-toastify";
import { Icon } from "@iconify/react";
import { decryptPassword } from "@/app/utils/helpers";
import { getProfileById } from "@/actions/user.actions";

const ViewUserProfile = () => {
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false); // State for password visibility
  const router = useRouter();
  const searchParams = useSearchParams();

  // Extract ID from query parameters
  const id = searchParams.get("id");

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!id) return;
      try {
        const { data, error } = await getProfileById(id);

        if (error) {
          console.error("Error fetching user profile:", error);
          toast.error("Failed to fetch profile: " + error);
        } else {
          setProfileData(data);
        }
      } catch (err) {
        console.error("Unexpected error:", err);
      }
    };

    fetchUserProfile();
  }, [id]);

  if (!profileData) {
    return (
      <div>
        <Loading />
      </div>
    );
  }

  // Toggle password visibility
  const togglePasswordVisibility = () => {
    console.log("Toggling password visibility");
    setPasswordVisible(!passwordVisible);
  };

  return (
    <Card className="mt-5">
      <div className="space-y-5 w-full">
        <div className="flex max-lg:flex-col pb-6 items-center w-full">
          <h6 className="md:mb-0 mb-3 w-full">User Profile</h6>
        </div>
        <div className="grid grid-cols-12 gap-6 capitalize">
          <div className="lg:col-span-12 col-span-12">
            <ul className="list space-y-8">
              <li className="flex space-x-3 rtl:space-x-reverse">
                <div className="flex-1">
                  <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
                    Name
                  </div>
                  <a
                    href={`mailto:${profileData.email}`}
                    className="text-base text-slate-600 dark:text-slate-50"
                  >
                    {profileData.first_name} {profileData.last_name}
                  </a>
                </div>
              </li>
              <li className="flex space-x-3 rtl:space-x-reverse lowercase">
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
              <li className="flex space-x-3 rtl:space-x-reverse">
  <div className="flex-1">
    <div className="uppercase text-xs text-slate-500 dark:text-slate-300 mb-1 leading-[12px]">
      Password
    </div>
    <div className="text-base flex text-slate-600 dark:text-slate-50">
      {passwordVisible
        ? decryptPassword(profileData.password) 
        : "*".repeat(profileData.password.length)}
      <Icon
        icon={
          passwordVisible
            ? "heroicons-outline:eye-off"
            : "heroicons-outline:eye"
        }
        className="ml-4 text-secondary-800 cursor-pointer"
        onClick={togglePasswordVisibility} // Correct function call
      />
    </div>
  </div>
</li>

            </ul>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default ViewUserProfile;
