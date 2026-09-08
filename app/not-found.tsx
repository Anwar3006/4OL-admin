import React from "react";
import Link from "next/link";
import Image from "next/image";

const PageNotFound = () => {
  return (
    <div className="min-h-screen flex flex-col justify-center items-center text-center py-20 dark:bg-slate-900">
      <Image src="/assets/images/all-img/404-2.svg" alt="" width={460} height={320} />
      <div className="max-w-[546px] mx-auto w-full mt-12">
        <h4 className="text-slate-900 dark:text-slate-100 mb-4">Page not found</h4>
        <div className="dark:text-white text-base font-normal mb-10">
          The page you are looking for might have been removed had its name
          changed or is temporarily unavailable.
        </div>
      </div>
      <div className="max-w-[300px] mx-auto w-full">
        <Link
          href="/analytics"
          className="btn bg-white dark:bg-slate-800 hover:bg-opacity-75 transition-all duration-150 block text-center"
        >
          Go to homepage
        </Link>
      </div>
    </div>
  );
};

export default PageNotFound;
