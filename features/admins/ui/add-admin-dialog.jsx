"use client";
import { inviteAdminAction } from "@/actions/authenticate.actions";
import CustomInput from "@/components/CustomInput";
import CustomSelect from "@/components/CustomSelect";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { cn } from "@/lib/utils";
import { useAddAdminDialog } from "@/stores/dialog-store";
import { adminInviteInputSchema } from "@/schemas/user-profile.schema";
import { ADMIN_ROLE_OPTIONS } from "@/lib/admin-roles";
// @ts-expect-error package exports typing issue in this repo
import { zodResolver } from "@hookform/resolvers/zod";
import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

const AddAdminDialog = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const addAdminDialog = useAddAdminDialog();

  const form = useForm({
    resolver: zodResolver(adminInviteInputSchema),
    defaultValues: {
      role: "registrar",
      email: "",
    },
  });

  const handleSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const result = await inviteAdminAction(data.email, data.role);
      if (!result.error) {
        toast.success("Invitation sent to " + data.email);
        addAdminDialog.close();
        form.reset();
      } else {
        // This will handle "An invite has already been sent to this email."
        // and other errors returned by the server action.
        toast.error(result.error);
      }
    } catch (error) {
      toast.error("Error: " + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={addAdminDialog.isOpen} onOpenChange={addAdminDialog.close}>
      <DialogContent className="max-w-2xl! max-h-[95vh] md:max-h-[90vh] overflow-y-auto py-5 px-2 md:px-6 bg-white">
        <DialogHeader>
          <DialogTitle>Invite an Admin</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className={cn("flex flex-col gap-6")}>
            <div className="flex flex-col items-center gap-1 text-center">
              <p className="text-muted-foreground text-sm text-balance">
                Fill in the form below to invite a new admin
              </p>
            </div>

            <CustomInput
              type="email"
              name="email"
              label="Email Address"
              placeholder="francis@gmail.com"
              control={form.control}
              description="This email address will be your primary form of contact. Periodically check your inbox."
              readOnly={false}
            />

            <CustomSelect
              name="role"
              label="Role"
              options={ADMIN_ROLE_OPTIONS}
              control={form.control}
              description="Role to assign to the invited admin."
            />

            <Button type="submit" className="py-5 bg-emerald-600" disabled={isSubmitting}>
              {isSubmitting ? "Sending..." : "Send Invite"}
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default AddAdminDialog;
