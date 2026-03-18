"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form } from "@/components/ui/form";
import { useAssignAdminDialog } from "@/stores/dialog-store";
import { useAssignAdmin } from "@/hooks/supabase-calls/useConversation";
import { useUsers } from "@/hooks/supabase-calls/useUser";
import {
  assignAdminSchema,
  TAssignAdminInput,
  TConversationOutput,
} from "@/schemas/conversation.schema";
import CustomSelect from "@/components/CustomSelect";
import { ShieldCheck, Loader2 } from "lucide-react";

const AssignAdminDialog = () => {
  const { isOpen, close, entityId, data } = useAssignAdminDialog();
  const assignAdminMutation = useAssignAdmin();

  const conversation = data as TConversationOutput;

  // Fetch admins
  const { data: adminData, isLoading: isLoadingAdmins } = useUsers({
    admin: true,
    limit: 100,
  });

  const form = useForm<TAssignAdminInput>({
    resolver: zodResolver(assignAdminSchema),
    defaultValues: {
      conversation_id: entityId || "",
      user_id: "",
    },
  });

  // Update form when entityId changes
  React.useEffect(() => {
    if (entityId) {
      form.setValue("conversation_id", entityId);
    }
  }, [entityId, form]);

  const onSubmit = (values: TAssignAdminInput) => {
    // Validate selected user's role before attempting to assign.
    const allowedRoles = ["super_admin", "admin"];
    const selected = adminData?.users?.find(
      (u: any) => u.user_id === values.user_id,
    );

    if (selected && !allowedRoles.includes(selected.role)) {
      setInvalidUserLabel(
        `${selected.first_name} ${selected.last_name} (${selected.role})`,
      );
      setShowInvalidRoleModal(true);
      return;
    }

    assignAdminMutation.mutate(values, {
      onSuccess: () => {
        form.reset();
        close();
      },
    });
  };

  // Local state for role validation modal
  const [showInvalidRoleModal, setShowInvalidRoleModal] = React.useState(false);
  const [invalidUserLabel, setInvalidUserLabel] = React.useState("");

  const adminOptions =
    adminData?.users.map((user) => ({
      value: user.user_id,
      label: `${user.first_name} ${user.last_name} (${user.role})`,
    })) || [];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={close}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Assign Admin
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-6">
              Select an admin to manage the group{" "}
              <strong>{conversation?.name || "Unnamed Group"}</strong>.
            </p>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-4"
              >
                <CustomSelect
                  control={form.control}
                  name="user_id"
                  label="Admin User"
                  placeholder={
                    isLoadingAdmins ? "Loading admins..." : "Select an admin"
                  }
                  options={adminOptions}
                  disabled={isLoadingAdmins || assignAdminMutation.isPending}
                />

                <DialogFooter className="mt-6 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={close}
                    disabled={assignAdminMutation.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={
                      assignAdminMutation.isPending || !form.watch("user_id")
                    }
                    className="gap-2"
                  >
                    {assignAdminMutation.isPending && (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    )}
                    Assign Admin
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={showInvalidRoleModal}
        onOpenChange={() => setShowInvalidRoleModal(false)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              Cannot assign user
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              You cannot assign <strong>{invalidUserLabel}</strong> as an admin.
              Only users with roles
              <strong> super_admin</strong> or <strong>admin</strong> can be
              assigned.
            </p>
          </div>

          <DialogFooter>
            <Button onClick={() => setShowInvalidRoleModal(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AssignAdminDialog;
