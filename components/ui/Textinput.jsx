import React, { useState } from "react";
import Icon from "@/components/ui/Icon";
import Cleave from "cleave.js/react";
import "cleave.js/dist/addons/cleave-phone.us";

const Textinput = ({
  type,
  label,
  placeholder = "Add placeholder",
  classLabel = "form-label",
  className = "",
  classGroup = "",
  register,
  name,
  readonly,
  value,
  error,
  icon,
  disabled,
  id,
  horizontal,
  validate,
  isMask,
  msgTooltip,
  description,
  hasicon,
  onChange,
  options,
  onFocus,
  defaultValue,
  required,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  
  const handleOpen = () => {
    setOpen(prev => !prev);
  };

  return (
    <div className={`formGroup ${error ? "has-error" : ""} ${horizontal ? "flex" : ""} ${validate ? "is-valid" : ""}`}>
      {label && (
        <label htmlFor={id} className={`block capitalize ${classLabel} ${horizontal ? "flex-0 mr-6 md:w-[100px] w-[60px] break-words" : ""}`}>
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={`relative ${horizontal ? "flex-1" : ""}`}>
        <input
          type={type === "password" && open ? "text" : type} // Adjusted conditional logic
          {...register(name)}
          {...rest}
          className={`${error ? "has-error" : ""} form-control py-2 ${className}`}
          placeholder={placeholder}
          readOnly={readonly}
          defaultValue={defaultValue}
          disabled={disabled}
          id={id}
          onChange={onChange}
        />
        {type === "password" && hasicon && ( // Ensure the icon only renders for password fields
          <span className="cursor-pointer absolute right-3 top-1/2 transform -translate-y-1/2" onClick={handleOpen}>
            {open ? <Icon icon="heroicons-outline:eye" /> : <Icon icon="heroicons-outline:eye-off"/>}
          </span>
        )}
        {/* Error and validation icons */}
        {error && (
          <span className="text-danger-500 absolute right-3 top-1/2 transform -translate-y-1/2">
            <Icon icon="heroicons-outline:information-circle" />
          </span>
        )}
        {validate && (
          <span className="text-success-500 absolute right-3 top-1/2 transform -translate-y-1/2">
            <Icon icon="bi:check-lg" />
          </span>
        )}
      </div>
      {error && (
        <div className={`mt-2 ${msgTooltip ? "inline-block bg-danger-500 text-white text-[10px] px-2 py-1 rounded" : "text-danger-500 block text-sm"}`}>
          {error.message}
        </div>
      )}
      {validate && (
        <div className={`mt-2 ${msgTooltip ? "inline-block bg-success-500 text-white text-[10px] px-2 py-1 rounded" : "text-success-500 block text-sm"}`}>
          {validate}
        </div>
      )}
      {description && <span className="input-description">{description}</span>}
    </div>
  );
};


export default Textinput;
