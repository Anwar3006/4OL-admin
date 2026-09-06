import { useDialogStore } from "@/stores/dialog-store";

export const useAddMarketingDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-marketing"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-marketing"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-marketing", { data }),
    close: () => closeDialog("add-marketing"),
  };
};

export const useViewMarketingDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-marketing"));
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-marketing"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-marketing", { entityId }),
    close: () => closeDialog("view-marketing"),
  };
};

export const useAddSubscriptionDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("add-subscription"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("add-subscription"),
  );

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-subscription", { data }),
    close: () => closeDialog("add-subscription"),
  };
};

export const useViewSubscriptionDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-subscription"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-subscription"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-subscription", { entityId }),
    close: () => closeDialog("view-subscription"),
  };
};

export const useAddDiscountDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("add-discount"));
  const data = useDialogStore((state) => state.getDialogData<T>("add-discount"));

  return {
    isOpen,
    data,
    isEditMode: !!data,
    open: (data?: T) => openDialog("add-discount", { data }),
    close: () => closeDialog("add-discount"),
  };
};

export const useViewDiscountDialog = () => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) => state.isDialogOpen("view-discount"));
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-discount"),
  );

  return {
    isOpen,
    entityId,
    open: (entityId: string) => openDialog("view-discount", { entityId }),
    close: () => closeDialog("view-discount"),
  };
};
