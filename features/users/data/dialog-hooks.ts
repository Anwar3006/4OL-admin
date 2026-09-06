import { useDialogStore } from "@/stores/dialog-store";

export const useViewUserDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-user"));
  const entityId = useDialogStore((state) => state.getEntityId("view-user"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-user", { entityId }),
    close: () => closeDialog("view-user"),
  };
};

export const useFlagUserDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("flag-user"));
  const entityId = useDialogStore((state) => state.getEntityId("flag-user"));
  const data = useDialogStore((state) => state.getDialogData("flag-user"));

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: any) =>
      openDialog("flag-user", { entityId, data }),
    close: () => closeDialog("flag-user"),
  };
};
