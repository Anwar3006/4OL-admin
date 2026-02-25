"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus } from "lucide-react";
import { useCreateFAQCategory } from "@/hooks/supabase-calls/useFAQ";
import { toast } from "sonner";

const categorySchema = z.object({
  name: z.string().min(2, "Category name must be at least 2 characters"),
});

type CategoryFormValues = z.infer<typeof categorySchema>;

interface ManageCategoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ManageCategoryDialog = ({
  isOpen,
  onClose,
}: ManageCategoryDialogProps) => {
  const createCategory = useCreateFAQCategory();

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: "" },
  });

  const onSubmit = async (data: CategoryFormValues) => {
    try {
      await createCategory.mutateAsync(data);
      toast.success("Category created successfully");
      form.reset();
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to create category");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add FAQ Category</DialogTitle>
          <DialogDescription>
            Create a new grouping for your frequently asked questions.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4 pt-4"
          >
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Billing, Appointments..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700"
                disabled={createCategory.isPending}
              >
                {createCategory.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Create Category"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
