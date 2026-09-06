import { useDialogStore } from "@/stores/dialog-store";

export const useViewMediactionReminderDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-medication-reminder"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-medication-reminder"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) =>
      openDialog("view-medication-reminder", { entityId }),
    close: () => closeDialog("view-medication-reminder"),
  };
};
