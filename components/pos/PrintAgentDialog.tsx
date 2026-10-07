"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, RefreshCw, Printer, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

import {
  AgentStatus,
  PrintAgentState,
  detectAgentState,
  mapStateFromDetection,
  pairAgent,
  testPrint,
  getToken,
} from "@/lib/printAgent/client";

const INSTALLER_URL = "/api/print-agent/download";
const AGENT_INSTALL_FLAG = "pos_print_agent_install_attempted";

export interface PrintAgentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onReady?: (state: Partial<PrintAgentState>) => void;
}

function statusCopy(status: string, printerName?: string | null) {
  switch (status) {
    case "ready":
      return { title: "Silent Printing Ready", subtitle: "Connected to the local Print Agent. Receipts will print silently to the Windows default printer.", tone: "success" as const };
    case "no_default_printer":
      return { title: "Printer Not Configured", subtitle: "No Windows default printer was found. Set one as the Windows default printer, then check again.", tone: "warning" as const };
    case "unavailable":
      return { title: "Print Agent Not Detected", subtitle: "We could not reach the local Print Agent on http://127.0.0.1:9100. Download and install it, then click Check Again.", tone: "warning" as const };
    case "installed":
      return { title: "Print Agent Detected", subtitle: "The agent is running. Complete pairing/permission if prompted, then proceed.", tone: "info" as const };
    case "needPermission":
      return { title: "Allow Local Printing", subtitle: "Chrome will ask for permission to communicate with the local printing service. When prompted, select Allow. This is required for silent printing.", tone: "info" as const };
    case "permissionBlocked":
      return { title: "Local Printing Permission Required", subtitle: "Chrome blocked access to the local printing service. Allow Local Network Access for this site in Chrome, then try again.", tone: "warning" as const };
    default:
      return { title: "Checking Print Agent", subtitle: "Looking for the local silent printing component...", tone: "info" as const };
  }
}

async function probeHealth(): Promise<boolean> {
  try {
    const res = await fetch("http://127.0.0.1:9100/health", {
      method: "GET",
      targetAddressSpace: "local",
    } as RequestInit);
    if (!res.ok) return false;
    return true;
  } catch {
    return false;
  }
}

export function PrintAgentDialog({ isOpen, onClose, onReady }: PrintAgentDialogProps) {
  const [state, setState] = useState<PrintAgentState>({
    status: "unknown",
    printer: null,
    error: undefined,
    isChecking: false,
    isPairing: false,
    isPrinting: false,
    token: getToken(),
  });

  const runCheck = useCallback(async () => {
    setState((prev) => ({ ...prev, isChecking: true, error: undefined }));
    try {
      const detected = await detectAgentState();
      const mapped = mapStateFromDetection(detected);
      setState((prev) => ({
        ...prev,
        ...mapped,
        isChecking: false,
        token: getToken(),
      }));
      if (onReady && (mapped.status === "ready" || detected.printer)) {
        onReady(mapped);
      }
    } catch (err: any) {
      let installAttempted = false;
      try {
        installAttempted = localStorage.getItem(AGENT_INSTALL_FLAG) === "1";
      } catch {}
      setState((prev) => ({
        ...prev,
        status: installAttempted ? "needPermission" : "unavailable",
        isChecking: false,
        error: installAttempted ? undefined : (err?.message || "Agent not detected"),
      }));
    }
  }, [onReady]);

  useEffect(() => {
    if (isOpen) {
      runCheck();
    }
  }, [isOpen, runCheck]);

  const handleInstall = useCallback(() => {
    try {
      localStorage.setItem(AGENT_INSTALL_FLAG, "1");
    } catch {}
    const anchor = document.createElement("a");
    anchor.href = INSTALLER_URL;
    anchor.download = "ButcheryPrintAgent-Setup.exe";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
  }, []);

  const handlePair = useCallback(async () => {
    setState((prev) => ({ ...prev, isPairing: true, error: undefined }));
    try {
      await pairAgent();
      await runCheck();
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isPairing: false,
        error: err?.message || "Pairing was denied or timed out",
      }));
    } finally {
      setState((prev) => ({ ...prev, isPairing: false }));
    }
  }, [runCheck]);


  const handlePermissionProbe = useCallback(async () => {
    setState((prev) => ({ ...prev, isChecking: true, error: undefined }));
    const ok = await probeHealth();
    if (ok) {
      await runCheck();
    } else {
      setState((prev) => ({
        ...prev,
        status: 'permissionBlocked',
        isChecking: false,
        error: undefined,
      }));
    }
  }, [runCheck]);


  const handleTest = useCallback(async () => {
    setState((prev) => ({ ...prev, isPrinting: true, error: undefined }));
    try {
      await testPrint();
      setState((prev) => ({ ...prev, isPrinting: false }));
    } catch (err: any) {
      setState((prev) => ({
        ...prev,
        isPrinting: false,
        error: err?.message || "Test print failed",
      }));
    }
  }, []);

  if (!isOpen) return null;

  const copy = statusCopy(state.status, state.printer?.name);
  const showInstall = state.status !== "ready" && state.status !== "installed" && state.status !== "needPermission";
  const showPair = state.status === "installed" && !state.token;
  const showTest = state.status === "ready";
  const showPermissionContinue = state.status === "needPermission";
  const showPermissionRetry = state.status === "permissionBlocked";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 select-none">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white text-zinc-900 rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200">
        <div className="p-5 border-b border-zinc-200 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              {copy.tone === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : copy.tone === "warning" ? (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              ) : (
                <Printer className="w-4 h-4 text-zinc-600" />
              )}
              <h2 className="text-base font-bold tracking-tight">{copy.title}</h2>
            </div>
            <p className="mt-1 text-xs text-zinc-600 leading-snug whitespace-pre-line">{copy.subtitle}</p>
            {state.printer?.name && state.status !== "ready" && (
              <p className="mt-1 text-[11px] text-zinc-500">Detected: {state.printer.name}</p>
            )}
            {state.error && (
              <p className="mt-2 text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                {state.error}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 rounded transition-colors"
          >
            ×
          </button>
        </div>
        <div className="p-5 flex flex-col gap-2">
          {state.status === "unknown" || state.isChecking ? (
            <div className="flex items-center gap-2 text-xs text-zinc-600">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Checking local print agent...</span>
            </div>
          ) : null}
          {showInstall && (
            <button
              type="button"
              onClick={handleInstall}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-2xs transition-colors"
            >
              <Download className="w-4 h-4" />
              <span>Install Print Agent</span>
            </button>
          )}
          {showPermissionContinue && (
            <button
              type="button"
              onClick={handlePermissionProbe}
              disabled={state.isChecking}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              {state.isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Continue</span>
            </button>
          )}
          {showPermissionRetry && (
            <button
              type="button"
              onClick={handlePermissionProbe}
              disabled={state.isChecking}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              {state.isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>Try Again</span>
            </button>
          )}
          {showPair && (
            <button
              type="button"
              onClick={handlePair}
              disabled={state.isPairing}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              {state.isPairing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{state.isPairing ? "Waiting for approval..." : "Check Again"}</span>
            </button>
          )}
          {(showInstall || showPair || state.status === "no_default_printer" || state.status === "unavailable") && (
            <button
              type="button"
              onClick={runCheck}
              disabled={state.isChecking}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              {state.isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              <span>{state.isChecking ? "Checking..." : "Check Again"}</span>
            </button>
          )}
          {showTest && (
            <button
              type="button"
              onClick={handleTest}
              disabled={state.isPrinting}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-zinc-900 hover:bg-black text-white rounded-xl text-sm font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              {state.isPrinting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
              <span>{state.isPrinting ? "Printing test..." : "Print Test"}</span>
            </button>
          )}
          {state.status === "ready" && (
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 border border-zinc-200 rounded-xl text-sm font-semibold text-zinc-700 hover:bg-zinc-50 transition-colors"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
