"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  itemName: string;
  itemType: string;
}

export function DeleteConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  itemName,
  itemType,
}: DeleteConfirmationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md rounded-xl border-slate-200 shadow-2xl bg-white">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-full bg-red-50 border border-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <AlertDialogTitle className="text-lg font-black text-slate-900 tracking-tight">
              {title}
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-sm text-slate-600 leading-relaxed ml-11">
            Are you sure you want to delete this {itemType}? This action cannot
            be undone.
            {itemName && (
              <span className="block mt-2 font-semibold text-slate-900">
                "{itemName}"
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="w-full flex justify-end gap-3! sm:gap-0">
          <AlertDialogCancel
            onClick={onClose}
            className="rounded-lg border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 font-bold uppercase tracking-widest text-[10px] h-10 px-6"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold uppercase tracking-widest text-[10px] h-10 px-6 shadow-lg shadow-red-100"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
