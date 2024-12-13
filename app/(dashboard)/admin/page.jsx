"use client";

import React from "react";
import useDarkmode from "@/hooks/useDarkMode";
import Card from "@/components/ui/Card";
import RolesAndPermissions from "@/components/partials/auth/Admin/roles_and_permission";

const Admin = () => {
  const [isDark] = useDarkmode();
  return (
    <>
      <div className="loginwrapper">
        <div className="lg-inner-column">
          <div className="right-column relative w-full">
          <div className=" w-full flex flex-col justify-center sm:p-5">
                <RolesAndPermissions />
              </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Admin;
