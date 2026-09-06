import React, { useEffect } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Helper to generate 30-min increments
const TIME_OPTIONS = Array.from({ length: 48 }).map((_, i) => {
  const hour = Math.floor(i / 2)
    .toString()
    .padStart(2, "0");
  const min = i % 2 === 0 ? "00" : "30";
  return `${hour}:${min}`;
});

export function BusinessHoursSection() {
  const { control, watch, setValue } = useFormContext();
  const { fields } = useFieldArray({ control, name: "business_hours" });

  const sameForWeekdays = watch("sameForWeekdays");
  const mondayHours = watch("business_hours.0"); // Monday is index 0

  // ✅ The "Auto-populate" Logic
  useEffect(() => {
    if (sameForWeekdays && mondayHours) {
      // Indices 1 to 4 are Tue, Wed, Thu, Fri
      [1, 2, 3, 4].forEach((index) => {
        setValue(`business_hours.${index}.open`, mondayHours.open);
        setValue(`business_hours.${index}.close`, mondayHours.close);
        setValue(`business_hours.${index}.isClosed`, mondayHours.isClosed);
      });
    }
  }, [sameForWeekdays, mondayHours, setValue]);

  return (
    <div className="space-y-4 py-4">
      <div className="flex items-center space-x-4 pb-2 border-b">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="sameForWeekdays"
            checked={sameForWeekdays}
            onCheckedChange={(checked: boolean) =>
              setValue("sameForWeekdays", checked)
            }
          />
          <Label htmlFor="sameForWeekdays">Same for Weekdays (Mon-Fri)</Label>
        </div>
      </div>

      <div className="grid gap-3">
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="flex items-center gap-1 md:gap-4 group"
          >
            <span className="w-18 md:w-24 font-medium text-xs md:text-sm">
              {(field as any).day}
            </span>

            <div className="flex items-center gap-2 flex-1">
              <Select
                disabled={
                  watch(`business_hours.${index}.isClosed`) ||
                  (index > 0 && sameForWeekdays && index < 5)
                }
                onValueChange={(v) =>
                  setValue(`business_hours.${index}.open`, v)
                }
                value={watch(`business_hours.${index}.open`)}
              >
                <SelectTrigger className="min-w-19 w-full text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <span className="text-muted-foreground text-xs md:text-sm">
                to
              </span>

              <Select
                disabled={
                  watch(`business_hours.${index}.isClosed`) ||
                  (index > 0 && sameForWeekdays && index < 5)
                }
                onValueChange={(v) =>
                  setValue(`business_hours.${index}.close`, v)
                }
                value={watch(`business_hours.${index}.close`)}
              >
                <SelectTrigger className="min-w-19 w-full text-xs md:text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIME_OPTIONS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                onCheckedChange={(v: any) =>
                  setValue(`business_hours.${index}.isClosed`, !!v)
                }
                checked={watch(`business_hours.${index}.isClosed`)}
              />
              <Label className="text-[0.5rem] md:text-xs">Closed</Label>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
