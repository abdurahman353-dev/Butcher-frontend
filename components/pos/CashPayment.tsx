"use client";

import React, { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/formatters";
import { calculateChange } from "@/lib/math";
import { Banknote, AlertCircle, HelpCircle } from "lucide-react";

interface CashPaymentProps {
  total: number;
  onConfirm: (amountReceived: number, change: number) => void;
  isProcessing?: boolean;
}

export function CashPayment({ total, onConfirm, isProcessing = false }: CashPaymentProps) {
  const [receivedStr, setReceivedStr] = useState<string>("");

  const receivedNum = receivedStr === "" ? 0 : parseFloat(receivedStr) || 0;
  const isSufficient = receivedNum >= total;
  const hasEnteredAmount = receivedStr.trim().length > 0;
  const change = isSufficient ? calculateChange(receivedNum, total) : 0;
  const remaining = Math.max(0, total - receivedNum);

  const handleKeypadPress = useCallback(
    (val: string) => {
      if (val === "C") { setReceivedStr(""); return; }
      if (val === "BACK") { setReceivedStr((p) => (p.length <= 1 ? "" : p.slice(0, -1))); return; }
      if (val === ".") {
        if (!receivedStr.includes(".")) setReceivedStr((p) => (p === "" ? "0." : p + "."));
        return;
      }
      setReceivedStr((p) => {
        if (p === "0") return val;
        if (p.length >= 9) return p;
        return p + val;
      });
    },
    [receivedStr]
  );

  const handleDenomination = useCallback(
    (denom: number) => {
      setReceivedStr((prev) => {
        const current = prev === "" ? 0 : parseFloat(prev) || 0;
        return (current + denom).toString();
      });
    },
    []
  );

  const setExact = useCallback(() => { setReceivedStr(total.toString()); }, [total]);

  // Physical/USB keyboard support — does NOT focus any DOM input, so no OS virtual keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target as HTMLElement)?.isContentEditable
      ) return;
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); handleKeypadPress(e.key); }
      else if (e.key === ".") { e.preventDefault(); handleKeypadPress("."); }
      else if (e.key === "Backspace") { e.preventDefault(); handleKeypadPress("BACK"); }
      else if (e.key === "Delete" || e.key === "Escape" || e.key.toLowerCase() === "c") { e.preventDefault(); handleKeypadPress("C"); }
      else if (e.key === "Enter" && isSufficient && !isProcessing) { e.preventDefault(); onConfirm(receivedNum, change); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleKeypadPress, isSufficient, isProcessing, receivedNum, change, onConfirm]);

  return (
    <div className="space-y-4 select-none">
      {/* ── Amount Received & Change/Remaining row — same layout as before ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* AMOUNT RECEIVED — display only, no DOM input so no virtual keyboard */}
        <div className="p-3.5 bg-slate-50 border-2 border-emerald-500 rounded-xl shadow-xs">
          <div className="flex items-center justify-between">
            <label className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">
              Amount Received
            </label>
            {hasEnteredAmount && (
              <button
                type="button"
                onClick={() => setReceivedStr("")}
                className="text-[10px] text-slate-400 hover:text-rose-600 font-semibold px-1 py-0.5 rounded transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          <div className="flex items-center mt-0.5 overflow-hidden">
            <span className="text-xl font-bold text-slate-400 mr-1 select-none shrink-0">KSh</span>
            <span className="text-xl font-bold text-slate-900 tabular-nums truncate">
              {receivedStr || <span className="text-slate-300">0.00</span>}
            </span>
            <span className="w-0.5 h-5 bg-emerald-600 ml-1 inline-block animate-pulse shrink-0" />
          </div>
        </div>

        {/* CHANGE DUE / REMAINING */}
        <div
          className={`p-3.5 border rounded-xl transition-colors ${
            isSufficient && hasEnteredAmount
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : hasEnteredAmount
              ? "bg-amber-50 border-amber-200 text-amber-800"
              : "bg-slate-50 border-slate-200 text-slate-400"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold tracking-wider block opacity-80">
            {isSufficient && hasEnteredAmount ? "Change Due" : "Remaining Amount"}
          </span>
          <div
            className={`text-xl font-bold tabular-nums mt-0.5 ${
              isSufficient && hasEnteredAmount
                ? "text-emerald-700"
                : hasEnteredAmount
                ? "text-amber-700"
                : "text-slate-400"
            }`}
          >
            {isSufficient ? formatCurrency(change) : hasEnteredAmount ? formatCurrency(remaining) : formatCurrency(total)}
          </div>
        </div>
      </div>

      {/* ── Guidance / Error Banner ── */}
      {/* Fixed-height banner — always occupies same space so keypad never shifts */}
      <div className="h-10 flex items-center">
        {!hasEnteredAmount ? (
          <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/70 border border-slate-200 px-2.5 py-1.5 rounded-lg w-full">
            <HelpCircle className="w-4 h-4 shrink-0 text-slate-500" />
            <span>Tap a denomination or use the numpad to enter cash received.</span>
          </div>
        ) : !isSufficient ? (
          <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg w-full">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{formatCurrency(remaining)} short of total ({formatCurrency(total)}).</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 rounded-lg w-full">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />
            <span>Ready — confirm the cash amount to complete the sale.</span>
          </div>
        )}
      </div>

      {/* ── Dual-Column Keypad Layout ── */}
      <div className="grid grid-cols-2 gap-3 xl:gap-5">

        {/* LEFT: Numeric keypad — 7 8 9 on top (like a POS machine) */}
        <div className="grid grid-cols-3 gap-2 xl:gap-3">
          {["7", "8", "9", "4", "5", "6", "1", "2", "3", "C", "0", "BACK"].map((k) => {
            const isClear = k === "C";
            const isBack = k === "BACK";
            return (
              <button
                key={k}
                type="button"
                onClick={() => handleKeypadPress(k)}
                className={`h-14 xl:h-16 rounded-xl text-lg xl:text-xl font-bold transition-all flex items-center justify-center active:scale-95 cursor-pointer shadow-sm ${
                  isClear
                    ? "bg-rose-50 hover:bg-rose-100 active:bg-rose-200 border border-rose-300 text-rose-700 text-base xl:text-lg"
                    : isBack
                    ? "bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-700 text-base xl:text-lg"
                    : "bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-200 text-slate-900"
                }`}
              >
                {isBack ? "⌫" : k}
              </button>
            );
          })}
        </div>

        {/* RIGHT: Denomination tender grid */}
        <div className="grid grid-cols-3 gap-2 xl:gap-3 content-start">
          {/* High denominations — KSh green tint */}
          {[1000, 500, 200].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDenomination(d)}
              className="h-14 xl:h-16 rounded-xl font-extrabold text-sm xl:text-base bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200 border border-emerald-300 text-emerald-900 transition-all flex flex-col items-center justify-center shadow-sm active:scale-95 cursor-pointer leading-tight"
            >
              <span className="text-[9px] xl:text-[11px] text-emerald-600 font-bold uppercase leading-none">KSh</span>
              <span>{d}</span>
            </button>
          ))}
          {/* Mid denominations */}
          {[100, 50, 20].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDenomination(d)}
              className="h-14 xl:h-16 rounded-xl font-extrabold text-sm xl:text-base bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-300 text-slate-800 transition-all flex flex-col items-center justify-center shadow-sm active:scale-95 cursor-pointer leading-tight"
            >
              <span className="text-[9px] xl:text-[11px] text-slate-500 font-bold uppercase leading-none">KSh</span>
              <span>{d}</span>
            </button>
          ))}
          {/* Low denominations */}
          {[10, 5].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => handleDenomination(d)}
              className="h-14 xl:h-16 rounded-xl font-extrabold text-sm xl:text-base bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-300 text-slate-800 transition-all flex flex-col items-center justify-center shadow-sm active:scale-95 cursor-pointer leading-tight"
            >
              <span className="text-[9px] xl:text-[11px] text-slate-500 font-bold uppercase leading-none">KSh</span>
              <span>{d}</span>
            </button>
          ))}
          {/* Decimal point */}
          <button
            type="button"
            onClick={() => handleKeypadPress(".")}
            className="h-14 xl:h-16 rounded-xl text-xl xl:text-2xl font-black bg-slate-100 hover:bg-slate-200 active:bg-slate-300 border border-slate-300 text-slate-700 transition-all flex items-center justify-center shadow-sm active:scale-95 cursor-pointer"
          >
            .
          </button>
          {/* Exact Total — spans all 3 columns */}
          <button
            type="button"
            onClick={setExact}
            className="col-span-3 h-14 xl:h-16 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm xl:text-base uppercase tracking-wide flex items-center justify-center shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <span className="truncate">Exact ({formatCurrency(total)})</span>
          </button>
        </div>
      </div>

      {/* ── Submit Button ── */}
      <button
        type="button"
        disabled={!isSufficient || isProcessing}
        onClick={() => onConfirm(receivedNum, change)}
        className={`w-full py-4 rounded-xl font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all ${
          !isSufficient || isProcessing
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-500/20 cursor-pointer"
        }`}
      >
        <Banknote className="w-5 h-5" />
        <span>
          {isProcessing
            ? "Completing Sale..."
            : !hasEnteredAmount
            ? "ENTER CASH AMOUNT"
            : !isSufficient
            ? `Short by ${formatCurrency(remaining)}`
            : `Complete Cash Sale — Change: ${formatCurrency(change)}`}
        </span>
      </button>
    </div>
  );
}
