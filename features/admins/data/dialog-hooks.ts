import { useDialogStore } from "@/stores/dialog-store";

export const useAddAdminDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-admin"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-admin"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-admin", { data }),
    close: () => closeDialog("add-admin"),
  };
};

export const useViewAdminDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-admin"));
  const entityId = useDialogStore((state) => state.getEntityId("view-admin"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-admin", { entityId }),
    close: () => closeDialog("view-admin"),
  };
};

export const useAssignAdminDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("assign-admin"));
  const entityId = useDialogStore((state) =>
    state.getEntityId("assign-admin"),
  );
  const data = useDialogStore((state) => state.getDialogData("assign-admin"));

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: any) =>
      openDialog("assign-admin", { entityId, data }),
    close: () => closeDialog("assign-admin"),
  };
};
