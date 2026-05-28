import React from "react";

export default function RolesMatrix() {
  return (
    <div className="card p-4">
      <h2 className="card-title mb-4">Roles & Permissions</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
         <div className="border p-4 rounded-lg bg-slate-50">Super Admin - Full Access</div>
         <div className="border p-4 rounded-lg">Admin Manager - Restricted</div>
      </div>
    </div>
  );
}
