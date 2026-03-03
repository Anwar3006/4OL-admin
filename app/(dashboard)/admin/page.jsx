"use client";

import React from "react";
import AdminSection from "./_components/AdminSection";
import { ViewUserDialog } from "../users/_components/view-user-dialog";
import AddAdminDialog from "./_components/add-admin-dialog";

export default function AdminPage() {
  return (
    <div className="mx-auto lg:px-4 py-4 sm:py-6 lg:pb-10 lg:pt-2 max-w-[2400px] bg-white shadow-sm mt-2 rounded-lg">
      <AdminSection />
      <ViewUserDialog />
      <AddAdminDialog />
    </div>
  );
}
