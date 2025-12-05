"use client";

import PrivacyPolicyContent from "@/components/privacy/PrivacyPolicyContent";

export default function PublicPrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-10 px-4">
      <div className="max-w-5xl mx-auto">
        <PrivacyPolicyContent />
      </div>
    </div>
  );
}

