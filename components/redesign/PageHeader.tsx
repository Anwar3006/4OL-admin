"use client";
import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageHeader({
  title,
  subtitle,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 mb-4 sm:mb-5">
      {/* Title block */}
      <div className="flex-1 min-w-0">
        <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-slate-800 dark:text-slate-200 truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate-400 mt-1 leading-relaxed">
            {subtitle}
          </p>
        )}
      </div>

      {/* Action buttons — wrap gracefully on small screens */}
      {children && (
        <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  );
}
