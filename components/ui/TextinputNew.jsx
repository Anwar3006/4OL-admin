// ✅ Textinput.js (controlled by react-hook-form)
import React, { useState } from "react";
import Icon from "@/components/ui/Icon";

const Textinput = ({
  type = "text",
  label,
  placeholder = "Add placeholder",
  classLabel = "form-label",
  className = "",
  register,
  name,
  readonly,
  error,
  icon,
  disabled,
  id,
  horizontal,
  validate,
  msgTooltip,
  description,
  hasicon,
  onChange,
  onFocus,
  required,
  ...rest
}) => {
  const [open, setOpen] = useState(false);
  const handleOpen = () => setOpen((prev) => !prev);

  return (
    <div className={`formGroup ${error ? "has-error" : ""} ${horizontal ? "flex" : ""}`}>      
      {label && (
        <label htmlFor={id || name} className={`block capitalize ${classLabel}`}>
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className="relative">
        <input
          type={type === "password" && open ? "text" : type}
          id={id || name}
          placeholder={placeholder}
          readOnly={readonly}
          disabled={disabled}
          onChange={onChange}
          onFocus={onFocus}
          {...register} 
          {...rest}
          className={`form-control py-2 ${error ? "border-red-500" : ""} ${className}`}
        />

        {type === "password" && hasicon && (
          <span className="cursor-pointer absolute right-3 top-1/2 transform -translate-y-1/2" onClick={handleOpen}>
            <Icon icon={open ? "heroicons-outline:eye" : "heroicons-outline:eye-off"} />
          </span>
        )}
      </div>

      {error && <p className="text-danger-500 text-sm mt-1">{error.message}</p>}
    </div>
  );
};

export default Textinput;
