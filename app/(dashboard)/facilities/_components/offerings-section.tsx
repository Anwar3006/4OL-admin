import React from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import CustomInput from "@/components/CustomInput";
import CustomSelect from "@/components/CustomSelect";

export function OfferingsSection() {
  const { control, watch } = useFormContext();
  const { fields, append, remove } = useFieldArray({
    control,
    name: "offerings",
  });

  return (
    <div className="space-y-4 pt-6 mt-6 border-t">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="card-title underline">Facility Offerings</h3>
          <p className="text-xs text-muted-foreground">Add subscriptions, sessions, or one-time fees</p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
          onClick={() =>
            append({
              name: "",
              description: "",
              price: 0,
              currency: "GHS",
              offering_type: "subscription",
              duration_months: 1,
              is_active: true,
            })
          }
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Offering
        </Button>
      </div>

      <div className="space-y-4">
        {fields.length === 0 && (
          <div className="text-center py-6 border-2 border-dashed rounded-xl bg-slate-50">
             <p className="text-sm text-slate-400">No offerings added yet. (Optional)</p>
          </div>
        )}
        {fields.map((field, index) => {
          const type = watch(`offerings.${index}.offering_type`);
          const showDuration = type === "subscription";

          return (
            <div
              key={field.id}
              className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end p-4 border rounded-xl bg-white shadow-sm relative group"
            >
              <div className="md:col-span-4">
                <CustomInput
                  type="text"
                  name={`offerings.${index}.name`}
                  label="Name (e.g. Monthly Gym Dues)"
                  placeholder="Offer name"
                  control={control}
                  readOnly={false}
                />
              </div>
              <div className="md:col-span-3">
                <CustomSelect
                  name={`offerings.${index}.offering_type`}
                  label="Offering Type"
                  options={[
                    { label: "Subscription / Dues", value: "subscription" },
                    { label: "Walk-in / Session", value: "walk-in" },
                    { label: "Package / Bundle", value: "package" },
                    { label: "One-time Fee", value: "onetime_fee" },
                  ]}
                  control={control}
                />
              </div>
              <div className="md:col-span-2">
                <CustomInput
                  type="number"
                  name={`offerings.${index}.price`}
                  label="Price (GHS)"
                  control={control}
                  readOnly={false}
                />
              </div>
              <div className={showDuration ? "md:col-span-2" : "md:col-span-2 opacity-30 select-none"}>
                <CustomInput
                  type="number"
                  name={`offerings.${index}.duration_months`}
                  label="Months"
                  placeholder="12"
                  control={control}
                  readOnly={!showDuration}
                />
              </div>
              <div className="md:col-span-1 flex justify-end">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => remove(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
