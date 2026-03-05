"use client";

import React from "react";
import UserSection from "./_components/UserSection";
import { ViewUserDialog } from "./_components/view-user-dialog";
import AddAdminDialog from "../admins/_components/add-admin-dialog";

export default function UsersPage() {
  return (
    <div className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <UserSection />
      <ViewUserDialog />
      <AddAdminDialog />
    </div>
  );
}
