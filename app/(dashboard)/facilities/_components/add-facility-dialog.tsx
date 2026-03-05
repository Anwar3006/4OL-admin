"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAddFacilityDialog } from "@/stores/dialog-store";
import AddFacilityForm from "@/components/partials/auth/Facilities/AddFacilityForm";
import { ScrollArea } from "@/components/ui/scroll-area";

const AddFacilityDialog = () => {
  const { isOpen, isEditMode, close } = useAddFacilityDialog();

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-2">
          <DialogTitle>
            {isEditMode ? "Edit Facility" : "Add New Facility"}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-full max-h-[calc(90vh-80px)] p-6 pt-0">
          <AddFacilityForm />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AddFacilityDialog;
