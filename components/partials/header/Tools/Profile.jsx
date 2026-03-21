import React, { useEffect, useState } from "react";
import Dropdown from "@/components/ui/Dropdown";
import Icon from "@/components/ui/Icon";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { getUserProfile } from "@/actions/user.actions";

const Profile = () => {
  const router = useRouter();
  const [userData, setUserData] = useState();

  useEffect(() => {
    const fetchUserRole = async () => {
      const { data, error } = await getUserProfile();
      if (error) {
        console.error("Error fetching user role:", error);
      } else {
        setUserData(data);
      }
    };

    fetchUserRole();
  }, []);

  const ProfileMenu = [
    {
      label: "Profile",
      icon: "heroicons-outline:user",
      action: () => router.push("/profile"),
    },
    {
      label: "Logout",
      icon: "heroicons-outline:login",
      action: async () => {
        try {
          // await dispatch(handleLogout()).unwrap();
          await authClient.signOut();
        } catch (error) {
          console.error("Logout failed:", error);
        }
        router.push("/login");
      },
    },
  ];

  const ProfileLabel = () => (
    <div className="flex items-center">
      <div className="flex-none capitalize text-slate-600 dark:text-white text-sm font-normal lg:flex-col max-lg:hidden whitespace-nowrap">
        <p className="text-[#56ce84] font-semibold text-left">
          {userData?.first_name} {userData?.last_name}
        </p>
        <p className="text-xs text-slate-600 dark:text-slate-200 text-left">
          {userData?.role.split("_")}
        </p>
      </div>
      <div className="flex-1 flex items-center justify-center ltr:ml-[10px] rtl:mr-[10px]">
        <div className="h-8 w-8 rounded-full">
          <img
            src="/assets/images/all-img/user.png"
            alt="User"
            className="block w-full h-full object-cover rounded-full"
          />
        </div>
      </div>
      <div className="flex-none text-base inline-block ltr:ml-[10px] rtl:mr-[10px]">
        <Icon icon="heroicons-outline:chevron-down" />
      </div>
    </div>
  );

  return (
    <Dropdown
      label={ProfileLabel()}
      classMenuItems="w-[180px] top-[58px]"
      items={ProfileMenu}
    />
  );
};

export default Profile;
