"use client";

import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { AlertTriangle, CheckCircle2, Info, XCircle, HelpCircle } from "lucide-react";

export type DialogType = "danger" | "warning" | "info" | "success";

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: DialogType;
}

export interface AlertOptions {
  title?: string;
  message: string;
  type?: DialogType;
  buttonText?: string;
}

interface DialogContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
  alert: (options: AlertOptions | string) => Promise<void>;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function useSystemDialog(): DialogContextType {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useSystemDialog must be used within a DialogProvider");
  }
  return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAlertMode, setIsAlertMode] = useState(false);
  const [dialogConfig, setDialogConfig] = useState<{
    title: string;
    message: string;
    confirmText: string;
    cancelText: string;
    type: DialogType;
  }>({
    title: "",
    message: "",
    confirmText: "Confirm",
    cancelText: "Cancel",
    type: "info",
  });

  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      resolverRef.current = resolve;
      setIsAlertMode(false);
      setDialogConfig({
        title: options.title,
        message: options.message,
        confirmText: options.confirmText || "Yes, Proceed",
        cancelText: options.cancelText || "Cancel",
        type: options.type || "warning",
      });
      setIsOpen(true);
    });
  }, []);

  const alert = useCallback((options: AlertOptions | string): Promise<void> => {
    return new Promise((resolve) => {
      resolverRef.current = () => resolve();
      setIsAlertMode(true);
      const isString = typeof options === "string";
      setDialogConfig({
        title: isString ? "Notice" : options.title || "Notice",
        message: isString ? options : options.message,
        confirmText: isString ? "OK" : options.buttonText || "OK",
        cancelText: "",
        type: isString ? "info" : options.type || "info",
      });
      setIsOpen(true);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(true);
      resolverRef.current = null;
    }
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolverRef.current) {
      resolverRef.current(false);
      resolverRef.current = null;
    }
  };

  // Type styling definitions
  const typeConfig = {
    danger: {
      icon: XCircle,
      iconBg: "bg-red-50 text-red-600 border-red-200",
      btnClass: "bg-red-600 hover:bg-red-700 text-white shadow-xs focus:ring-red-500",
      badgeColor: "text-red-700 bg-red-50",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-amber-50 text-amber-600 border-amber-200",
      btnClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs focus:ring-amber-500",
      badgeColor: "text-amber-700 bg-amber-50",
    },
    success: {
      icon: CheckCircle2,
      iconBg: "bg-green-50 text-green-600 border-green-200",
      btnClass: "bg-green-600 hover:bg-green-700 text-white shadow-xs focus:ring-green-500",
      badgeColor: "text-green-700 bg-green-50",
    },
    info: {
      icon: Info,
      iconBg: "bg-zinc-100 text-zinc-700 border-zinc-200",
      btnClass: "bg-zinc-900 hover:bg-black text-white shadow-xs focus:ring-zinc-500",
      badgeColor: "text-zinc-700 bg-zinc-100",
    },
  }[dialogConfig.type];

  const Icon = typeConfig.icon;

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 select-none animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          {/* Backdrop with blur */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={isAlertMode ? handleConfirm : handleCancel}
          />

          {/* Modal Container */}
          <div className="relative w-full max-w-md bg-white rounded-2xl border border-zinc-200 shadow-2xl p-6 overflow-hidden z-10 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <div
                className={`w-11 h-11 rounded-2xl border flex items-center justify-center shrink-0 ${typeConfig.iconBg}`}
              >
                <Icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-zinc-900 tracking-tight">
                  {dialogConfig.title}
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-zinc-600 leading-relaxed break-words whitespace-pre-line">
                  {dialogConfig.message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex items-center justify-end gap-2.5">
              {!isAlertMode && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50 active:bg-zinc-100 text-xs font-semibold text-zinc-700 transition-colors focus:outline-hidden focus:ring-2 focus:ring-zinc-400"
                >
                  {dialogConfig.cancelText}
                </button>
              )}
              <button
                type="button"
                onClick={handleConfirm}
                autoFocus
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 focus:outline-hidden focus:ring-2 focus:ring-offset-2 ${typeConfig.btnClass}`}
              >
                {dialogConfig.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  );
}
