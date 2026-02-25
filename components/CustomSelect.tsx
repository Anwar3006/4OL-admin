import React from "react";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Control, FieldPath, FieldValues } from "react-hook-form";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type CustomSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label?: string;
  placeholder?: string;
  description?: string;
  disabled?: boolean;
  options: { value: string; label: string }[];
  className?: string;
  formItemClassName?: string;
};

const CustomSelect = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder = "Select an option",
  description,
  disabled = false,
  options,
  className,
  formItemClassName,
}: CustomSelectProps<T>) => {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => {
        const selectedOption = options.find((opt) => opt.value === field.value);

        return (
          <FormItem className={formItemClassName}>
            {label && <FormLabel>{label}</FormLabel>}
            <FormControl>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    disabled={disabled}
                    className={cn(
                      "w-full justify-between font-normal",
                      !field.value && "text-muted-foreground",
                      className,
                    )}
                  >
                    {selectedOption ? selectedOption.label : placeholder}
                    <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-full min-w-(--radix-dropdown-menu-trigger-width)">
                  {options.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onSelect={() => field.onChange(option.value)}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          field.value === option.value
                            ? "opacity-100"
                            : "opacity-0",
                        )}
                      />
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </FormControl>
            {description && <FormDescription>{description}</FormDescription>}
            <FormMessage className="text-xs" />
          </FormItem>
        );
      }}
    />
  );
};

export default CustomSelect;
