'use client'
import React from "react";
import useSkin from "@/hooks/useSkin";

const Card = ({
  children,
  title,
  subtitle,
  headerslot,
  className = "custom-class bg-white dark:bg-slate-800 ",
  bodyClass = "p-6",
  noborder,
  titleClass = "custom-class ",
  image,
  imageClass,
  headerClass = "flex max-sm:flex-col sm:justify-between sm:items-center items-start"
}) => {
  const [skin] = useSkin();

  return (
    <div
      className={`
        card rounded-md  w-full bg-white dark:bg-slate-800   ${
          skin === "bordered"
            ? " border w-full border-slate-200 dark:border-slate-700 dark:bg-slate-700"
            : "shadow-base"
        }
   
    ${className}
        `}
    >
     {image && (
      <div className="card-image">
        <img src={image} alt="logo" className={`object-cover ${imageClass}`} />
      </div>  
     )}
      {(title || subtitle) && (
        <header className={`card-header ${headerClass} ${noborder ? "no-border" : ""}`}>
          <div>
            {title && <div className={`card-title ${titleClass}`}>{title}</div>}
            {subtitle && <div className="card-subtitle">{subtitle}</div>}
          </div>
          {headerslot && <div className="card-header-slot">{headerslot}</div>}
        </header>
      )}
      <main className={`card-body ${bodyClass}`}>{children}</main>
    </div>
  );
};

export default Card;
