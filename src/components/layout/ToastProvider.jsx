"use client";

import { ToastContainer } from "@/components/ui/Toast";
import { useToast } from "@/lib/useToast";

export function ToastProvider({ children }) {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </>
  );
}
