"use client";
import React from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="page-header">
      {/* Title block */}
      <div className="page-header-left">
        <h1 className="page-title">{title}</h1>
        {subtitle && <p className="page-subtitle">{subtitle}</p>}
      </div>

      {/* Action buttons — wrap gracefully on small screens */}
      {children && (
        <div className="page-header-actions">
          {children}
        </div>
      )}
    </div>
  );
}
