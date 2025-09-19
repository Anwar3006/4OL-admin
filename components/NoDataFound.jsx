import Image from "next/image";
import React from "react";

export default function NoDataFound() {
  return (
    <div className="flex flex-col items-center justify-center h-full opacity-70">
      <Image
        src="/assets/images/all-img/no-data-found.png"
        alt="No Data Found"
        width={300}
        height={300}
      />
      <p className="text-gray-500">No Data Found</p>
    </div>
  );
}
