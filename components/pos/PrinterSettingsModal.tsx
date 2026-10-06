"use client";

import React, { useState, useEffect } from "react";
import { Printer, X, CheckCircle2, AlertTriangle, RefreshCw, Zap, ShieldCheck } from "lucide-react";
import { printService } from "@/lib/qz/printService";
import { useSystemDialog } from "@/contexts/DialogContext";

interface PrinterSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterSettingsModal({ isOpen, onClose }: PrinterSettingsModalProps) {
  const { alert } = useSystemDialog();
  const [printers, setPrinters] = useState<string[]>([]);
  const [selectedPrinter, setSelectedPrinter] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Load saved printer
    const saved = printService.getSavedPrinter();
    if (saved) setSelectedPrinter(saved);

    // Check existing connection
    const connected = printService.isConnected();
    setIsConnected(connected);

    if (connected) {
      loadPrinters();
    }
  }, [isOpen]);

  const loadPrinters = async () => {
    try {
      setIsConnecting(true);
      setStatusMessage("Discovering printers installed on this PC...");
      const list = await printService.getPrinters();
      setPrinters(list);
      setIsConnected(true);

      const saved = printService.getSavedPrinter();
      if (saved && list.includes(saved)) {
        setSelectedPrinter(saved);
      } else if (list.length > 0 && !selectedPrinter) {
        // Try to pick common receipt printer or system default
        const defaultPr = await printService.getDefaultPrinter().catch(() => "");
        setSelectedPrinter(defaultPr || list[0]);
      }
      setStatusMessage(null);
    } catch (err: any) {
      console.error(err);
      setStatusMessage(err.message || "Could not detect printers.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setStatusMessage("Connecting to QZ Tray daemon (ws://localhost:8182)...");
    try {
      await printService.connect();
      setIsConnected(true);
      setStatusMessage("Connected! Scanning installed printers...");
      await loadPrinters();
      await alert({
        title: "QZ Tray Connected",
        message: "Successfully connected to QZ Tray! You can now select your receipt printer for direct silent printing.",
        type: "success",
      });
    } catch (err: any) {
      setIsConnected(false);
      setStatusMessage(err.message || "Connection failed.");
      await alert({
        title: "QZ Tray Connection Failed",
        message:
          "Could not connect to QZ Tray.\n\nPlease check:\n1. Is QZ Tray installed and currently running in your taskbar?\n2. If not, open QZ Tray and click 'Connect' again.",
        type: "warning",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSavePrinter = async () => {
    if (!selectedPrinter) {
      await alert({
        title: "Select Printer",
        message: "Please choose a receipt printer from the dropdown first.",
        type: "warning",
      });
      return;
    }

    printService.savePrinter(selectedPrinter);
    await alert({
      title: "Printer Saved",
      message: `"${selectedPrinter}" has been saved as your default receipt printer for this terminal. Receipts will now print directly with zero dialogs!`,
      type: "success",
    });
    onClose();
  };

  const handleTestPrint = async () => {
    if (!selectedPrinter) {
      await alert({
        title: "Select Printer",
        message: "Please select a printer to test.",
        type: "warning",
      });
      return;
    }

    setIsTesting(true);
    try {
      await printService.printTestSlip(selectedPrinter);
      await alert({
        title: "Test Slip Sent",
        message: `A test receipt was sent directly to "${selectedPrinter}". Please check your printer!`,
        type: "success",
      });
    } catch (err: any) {
      await alert({
        title: "Test Print Failed",
        message: err.message || "Failed to print test slip. Ensure printer is turned on and paper is loaded.",
        type: "danger",
      });
    } finally {
      setIsTesting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-zinc-200 overflow-hidden z-10">
        {/* Header */}
        <div className="px-6 py-4 bg-zinc-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold">Receipt Printer Setup</h2>
              <p className="text-xs text-zinc-400">Silent thermal printing via QZ Tray (No print dialogs)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Status banner */}
          <div
            className={`p-3.5 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              isConnected
                ? "bg-emerald-50 border-emerald-200 text-emerald-900"
                : "bg-amber-50 border-amber-200 text-amber-900"
            }`}
          >
            <div className="flex items-center gap-2">
              {isConnected ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <div>
                <p className="font-bold">
                  {isConnected ? "QZ Tray Daemon: Active & Connected" : "QZ Tray: Not Connected"}
                </p>
                <p className="text-[11px] opacity-80">
                  {isConnected
                    ? "Cryptographic signing active. Direct silent printing enabled."
                    : "QZ Tray must be running on this PC for direct silent printing."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleConnect}
              disabled={isConnecting}
              className={`px-3 py-1.5 rounded-lg font-bold text-xs shrink-0 transition-colors flex items-center gap-1.5 ${
                isConnected
                  ? "bg-emerald-600 text-white hover:bg-emerald-700"
                  : "bg-amber-600 text-white hover:bg-amber-700"
              }`}
            >
              <RefreshCw className={`w-3 h-3 ${isConnecting ? "animate-spin" : ""}`} />
              <span>{isConnecting ? "Connecting..." : isConnected ? "Refresh" : "Connect"}</span>
            </button>
          </div>

          {statusMessage && (
            <p className="text-xs text-zinc-500 italic flex items-center gap-1.5">
              <RefreshCw className="w-3 h-3 animate-spin text-zinc-400" />
              <span>{statusMessage}</span>
            </p>
          )}

          {/* Printer Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-zinc-700">
              Select Receipt / Thermal Printer <span className="text-rose-500">*</span>
            </label>

            {printers.length > 0 ? (
              <select
                value={selectedPrinter}
                onChange={(e) => setSelectedPrinter(e.target.value)}
                className="w-full h-11 px-3 text-sm bg-white border border-zinc-200 rounded-xl font-medium text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 shadow-2xs"
              >
                <option value="" disabled>
                  — Select printer installed on this PC —
                </option>
                {printers.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl text-xs text-zinc-500">
                {isConnected ? (
                  <span>No printers detected. Ensure your receipt printer USB or driver is installed.</span>
                ) : (
                  <span>Click <strong>Connect</strong> above to detect printers installed on this machine.</span>
                )}
              </div>
            )}

            <p className="text-[11px] text-zinc-400">
              Common receipt printers: <em>XP-80C, EPSON TM-T20, POS-80, Bixolon, Rongta</em>.
            </p>
          </div>

          {/* Features info */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-zinc-800 block">Instant Print</span>
                <span className="text-[10px] text-zinc-500">No Chrome print dialog</span>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-zinc-50 border border-zinc-200 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <span className="font-bold text-zinc-800 block">SHA-512 Signed</span>
                <span className="text-[10px] text-zinc-500">Trusted by QZ Tray</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-zinc-50 border-t border-zinc-200 flex items-center justify-between">
          <button
            type="button"
            onClick={handleTestPrint}
            disabled={!selectedPrinter || isTesting}
            className="h-9 px-3.5 rounded-xl border border-zinc-300 bg-white hover:bg-zinc-100 text-zinc-700 text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5 shadow-2xs"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>{isTesting ? "Printing Test..." : "Print Test Slip"}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-3.5 rounded-xl text-zinc-600 hover:text-zinc-900 text-xs font-semibold"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSavePrinter}
              disabled={!selectedPrinter}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold transition-all shadow-sm disabled:opacity-40"
            >
              Save As Terminal Printer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
