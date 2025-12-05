import React from "react";

const Card = ({ title, className, bodyClass, children }) => (
  <div className={`shadow rounded p-4 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-200 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-slate-200">{title}</h3>}
    <div className={bodyClass}>{children}</div>
  </div>
);

export default Card;
