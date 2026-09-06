import { useDialogStore } from "@/stores/dialog-store";

export const useAddTopRatedItemDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-top-rated-item"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("add-top-rated-item"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-top-rated-item", { data }),
    close: () => closeDialog("add-top-rated-item"),
  };
};
