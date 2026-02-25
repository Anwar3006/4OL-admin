import React from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import { Input } from "./ui/input";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { Textarea } from "./ui/textarea";
import { cn } from "@/lib/utils";

type CustomInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  type: "text" | "email" | "password" | "number" | "textarea" | "select";
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  readOnly?: boolean;
  className?: string;
  formItemClassName?: string;
};

const CustomInput = <T extends FieldValues>({
  control,
  name,
  type,
  label,
  placeholder,
  description,
  disabled = false,
  readOnly = true,
  className,
  formItemClassName,
}: CustomInputProps<T>) => {
  const renderInput = (field: any) => {
    switch (type) {
      case "text":
      case "email":
      case "password":
      case "number":
        return (
          <Input
            type={type}
            placeholder={placeholder}
            {...field}
            disabled={disabled}
            className={className}
            readOnly={readOnly}
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={placeholder}
            {...field}
            disabled={disabled}
            className={cn("overflow-y-scroll h-42", className)}
            readOnly={readOnly}
          />
        );

      default:
        return (
          <Input
            type="text"
            placeholder={placeholder}
            disabled={disabled}
            readOnly={readOnly}
            className={className}
            {...field}
          />
        );
    }
  };

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={formItemClassName}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>{renderInput(field)}</FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

export default CustomInput;
