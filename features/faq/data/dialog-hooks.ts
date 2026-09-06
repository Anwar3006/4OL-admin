import { useDialogStore } from "@/stores/dialog-store";

export const useAddFAQDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-faq"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-faq"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-faq", { data }),
    close: () => closeDialog("add-faq"),
  };
};

export const useViewFAQDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-faq"));
  const entityId = useDialogStore((state) => state.getEntityId("view-faq"));

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-faq", { entityId }),
    close: () => closeDialog("view-faq"),
  };
};
