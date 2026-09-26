import { useDialogStore } from "@/stores/dialog-store";

export const useViewMediactionReminderDialog = <T = any>() => {
  const openDialog = useDialogStore((state) => state.openDialog);
  const closeDialog = useDialogStore((state) => state.closeDialog);
  const isOpen = useDialogStore((state) =>
    state.isDialogOpen("view-medication-reminder"),
  );
  const entityId = useDialogStore((state) =>
    state.getEntityId("view-medication-reminder"),
  );
  // The Logged Reminders list row already carries the joined patient
  // (user_profiles) and adherence aggregates that the detail re-fetch
  // (select "*" on medication_reminders) does not. Pass it through so the
  // dialog can show masked-patient + adherence without a second join.
  const data = useDialogStore((state) =>
    state.getDialogData<T>("view-medication-reminder"),
  );

  return {
    isOpen,
    entityId,
    data,
    open: (entityId: string, data?: T) =>
      openDialog("view-medication-reminder", { entityId, data }),
    close: () => closeDialog("view-medication-reminder"),
  };
};
