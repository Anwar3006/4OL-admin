"use client";

import React, { useState } from "react";
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
import { useMakeGroupLeaderDialog } from "@/stores/dialog-store";
import { useMakeGroupLeader } from "@/hooks/supabase-calls/useConversation";
import { useFacilityProfiles } from "@/hooks/supabase-calls/useFacilities";
import CustomSelect from "@/components/CustomSelect";
import { ShieldCheck, Loader2 } from "lucide-react";
import { z } from "zod";

const promoteToLeaderSchema = z.object({
  user_id: z.string().min(1, "User ID is required"),
  conversation_id: z.string().min(1, "Please select a facility"),
});

type TPromoteToLeaderInput = z.infer<typeof promoteToLeaderSchema>;

const PromoteToLeaderDialog = () => {
  const { isOpen, close, entityId, data: user } = useMakeGroupLeaderDialog();
  const promoteMutation = useMakeGroupLeader();

  // Fetch facilities to select from
  // We need to find facilities that have a conversation_id
  const { data: facilityData, isLoading: isLoadingFacilities } = useFacilityProfiles({
    page: 1,
    limit: 1000,
    includeStatsOnly: false,
  });

  const form = useForm<TPromoteToLeaderInput>({
    resolver: zodResolver(promoteToLeaderSchema),
    defaultValues: {
      user_id: entityId || "",
      conversation_id: "",
    },
  });

  // Update form when entityId changes
  React.useEffect(() => {
    if (entityId) {
      form.setValue("user_id", entityId);
    }
    if (!isOpen) {
      form.reset();
    }
  }, [entityId, isOpen, form]);

  const onSubmit = (values: TPromoteToLeaderInput) => {
    promoteMutation.mutate(values, {
      onSuccess: () => {
        close();
      },
    });
  };

  const facilityOptions =
    facilityData?.facilities
      ?.filter((f: any) => f.conversation_id)
      .map((f: any) => ({
        value: f.conversation_id,
        label: f.facility_name,
      })) || [];

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold">
            <ShieldCheck className="w-5 h-5 text-emerald-500" />
            Make Group Leader
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground mb-6">
            Assign <strong>{user?.name || user?.first_name ? `${user.first_name} ${user.last_name}` : "this user"}</strong> as the group leader for a facility.
            This user will be able to manage the group and send updates.
          </p>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
            >
              <CustomSelect
                control={form.control}
                name="conversation_id"
                label="Select Facility"
                placeholder={
                  isLoadingFacilities ? "Loading facilities..." : "Select a facility"
                }
                options={facilityOptions}
                disabled={isLoadingFacilities || promoteMutation.isPending}
              />

              <DialogFooter className="mt-6 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={close}
                  disabled={promoteMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    promoteMutation.isPending || !form.watch("conversation_id")
                  }
                  className="gap-2"
                >
                  {promoteMutation.isPending && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Promote to Leader
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PromoteToLeaderDialog;
