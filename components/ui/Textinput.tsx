import { type InputHTMLAttributes, type ReactNode, useState } from "react";
import type { FieldError, UseFormRegister } from "react-hook-form";

import Icon from "@/components/ui/Icon";

export interface TextinputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  label?: ReactNode;
  classLabel?: string;
  className?: string;
  classGroup?: string;
  /**
   * react-hook-form's `register`. Optional — the field works as a plain
   * controlled input without it, which is how the OTP and reset-password
   * screens use it.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  register?: UseFormRegister<any>;
  /** Legacy spelling of `readOnly`; kept because the call sites pass it. */
  readonly?: boolean;
  error?: FieldError;
  icon?: string;
  horizontal?: boolean;
  /** Success message. Truthy also switches the field into its valid style. */
  validate?: string;
  msgTooltip?: boolean;
  description?: ReactNode;
  /** Show the password reveal toggle. Only has an effect when type="password". */
  hasicon?: boolean;
}

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
  msgTooltip,
  description,
  hasicon,
  onChange,
  onFocus,
  defaultValue,
  required,
  autoComplete,
  ...rest
}: TextinputProps) => {
  const [open, setOpen] = useState(false);

  const handleOpen = () => {
    setOpen((prev) => !prev);
  };

  return (
    <div
      className={`formGroup ${error ? "has-error" : ""} ${
        horizontal ? "flex" : ""
      } ${validate ? "is-valid" : ""}`}
    >
      {label && (
        <label
          htmlFor={id}
          className={`block capitalize ${classLabel} ${
            horizontal ? "flex-0 mr-6 md:w-[100px] w-[60px] break-words" : ""
          }`}
        >
          {label}
          {required && <span className="text-red-500">*</span>}
        </label>
      )}
      <div className={`relative ${horizontal ? "flex-1" : ""}`}>
        <input
          type={type === "password" && open ? "text" : type}
          {...(register && name ? register(name) : {})}
          className={`${
            error ? "has-error" : ""
          } form-control py-2 ${className}`}
          placeholder={placeholder}
          readOnly={readonly}
          value={value}
          disabled={disabled}
          id={id}
          onChange={onChange}
          onFocus={onFocus}
          autoComplete={autoComplete}
          {...rest}
        />
        {type === "password" && hasicon && (
          <span
            className="cursor-pointer absolute right-3 top-1/2 transform -translate-y-1/2"
            onClick={handleOpen}
          >
            {open ? (
              <Icon icon="heroicons-outline:eye" />
            ) : (
              <Icon icon="heroicons-outline:eye-off" />
            )}
          </span>
        )}
        {validate && (
          <span className="text-success-500 absolute right-3 top-1/2 transform -translate-y-1/2">
            <Icon icon="bi:check-lg" />
          </span>
        )}
      </div>
      {error && (
        <div
          className={`mt-2 ${
            msgTooltip
              ? "inline-block bg-danger-500 text-white text-2xs px-2 py-1 rounded"
              : "text-danger-500 block text-sm"
          }`}
        >
          {error.message}
        </div>
      )}
      {validate && (
        <div
          className={`mt-2 ${
            msgTooltip
              ? "inline-block bg-success-500 text-white text-2xs px-2 py-1 rounded"
              : "text-success-500 block text-sm"
          }`}
        >
          {validate}
        </div>
      )}
      {description && <span className="input-description">{description}</span>}
    </div>
  );
};

export default Textinput;
