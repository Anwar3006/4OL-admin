import { useDialogStore } from "@/stores/dialog-store";

/**
 * Period Tracker ▸ Users & Cycles row detail. Opens with the already-fetched
 * row from the "users" tab (see features/period/api/data-get.ts) rather than
 * re-fetching by id — that row is already privacy-minimized (masked name)
 * and has every field the dialog shows.
 */
export const useViewPeriodUserDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-period-user"),
  );
  const data = useDialogStore((state) =>
    state.getDialogData<T>("view-period-user"),
  );

  return {
    isOpen,
    data,
    open: (row: T) => openDialog("view-period-user", { data: row }),
    close: () => closeDialog("view-period-user"),
  };
};
