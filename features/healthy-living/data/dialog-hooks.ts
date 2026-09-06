import { useDialogStore } from "@/stores/dialog-store";

export const useAddHealthyLivingDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-healthy-living"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("add-healthy-living"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-healthy-living", { data }),
    close: () => closeDialog("add-healthy-living"),
  };
};

export const useViewHealthyLivingDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-healthy-living"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-healthy-living"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-healthy-living", { entityId }),
    close: () => closeDialog("view-healthy-living"),
  };
};
