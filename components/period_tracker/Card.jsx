import React from "react";

const Card = ({ title, className, bodyClass, children }) => (
  <div className={`shadow rounded p-4 ${className}`}>
    {title && <h3 className="text-lg font-semibold mb-2">{title}</h3>}
    <div className={bodyClass}>{children}</div>
  </div>
);

export default Card;
