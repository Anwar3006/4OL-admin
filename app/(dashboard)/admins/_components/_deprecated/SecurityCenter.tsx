import React from "react";

export default function SecurityCenter() {
  return (
    <div className="card p-4">
      <h2 className="card-title mb-4">Security Center</h2>
      <div className="space-y-4">
        <div className="flex justify-between">
          <span>Platform Security Score</span>
          <span className="font-bold text-yellow-600">82/100</span>
        </div>
      </div>
    </div>
  );
}
