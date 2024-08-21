import React from "react";
import Icon from "@/components/ui/Icon";

const FormGroup = ({
  label,
  classLabel = "form-label",
  className = "",
  error,
  id,
  horizontal = false, // Default to false if not provided
  validate,
  msgTooltip = false, // Default to false if not provided
  description,
  children,
}) => {
  return (
    <div
      className={`formGroup ${error ? "has-error" : ""} ${
        validate ? "is-valid" : ""
      } ${horizontal ? "flex" : ""} ${className}`}
    >
      {label && (
        <label
          htmlFor={id}
          className={`block capitalize ${classLabel} ${
            horizontal ? "flex-shrink-0 mr-6 md:w-[100px] w-[60px] break-words" : ""
          }`}
        >
          {label}
        </label>
      )}
      <div className={`relative ${horizontal ? "flex-grow" : ""}`}>
        {children}

        {/* Icon rendering */}
        {(error || validate) && (
          <div className="flex text-xl absolute ltr:right-[14px] rtl:left-[14px] top-1/2 transform -translate-y-1/2 space-x-1 rtl:space-x-reverse">
            {error && (
              <span className="text-danger-500">
                <Icon icon="heroicons-outline:information-circle" />
              </span>
            )}
            {validate && (
              <span className="text-success-500">
                <Icon icon="bi:check-lg" />
              </span>
            )}
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div
          className={`mt-2 ${
            msgTooltip
              ? "inline-block bg-danger-500 text-white text-[10px] px-2 py-1 rounded"
              : "text-danger-500 block text-sm"
          }`}
        >
          {error.message}
        </div>
      )}

      {/* Validation success message */}
      {validate && !error && (
        <div
          className={`mt-2 ${
            msgTooltip
              ? "inline-block bg-success-500 text-white text-[10px] px-2 py-1 rounded"
              : "text-success-500 block text-sm"
          }`}
        >
          {validate}
        </div>
      )}

      {/* Description message */}
      {description && <span className="input-description">{description}</span>}
    </div>
  );
};

export default FormGroup;
