"use client";
import React, {
  ForwardRefExoticComponent,
  JSX,
  RefAttributes,
  useState,
} from "react";
import { Button } from "./ui/button";
import { LucideProps } from "lucide-react";

type SectionHeaderProps = {
  title: string;
  description: string;
  Icon: ForwardRefExoticComponent<
    Omit<LucideProps, "ref"> & RefAttributes<SVGSVGElement>
  >;
  buttonLabel?: string;
  hasButton?: boolean;
  onButtonClick?: () => void;
};

const SectionHeader = ({
  title,
  description,
  Icon,
  buttonLabel,
  hasButton = true,
  onButtonClick,
}: SectionHeaderProps) => {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
      <div>
        <h1 className="card-title">
          {title}
        </h1>
        <p className="text-xs text-muted-foreground mt-1">{description}</p>
      </div>

      {hasButton && (
        <Button
          type="button"
          className="text-xs sm:text-sm xl:text-base flex items-center gap-2 w-full sm:w-auto"
          onClick={onButtonClick}
        >
          <Icon size={16} />
          {buttonLabel}
        </Button>
      )}

      {/* {Dialog && <Dialog open={dialogOpen} handleDialogOpen={setDialogOpen} />} */}
    </div>
  );
};

export default SectionHeader;
