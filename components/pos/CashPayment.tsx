"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/formatters";
import { calculateChange, roundTo } from "@/lib/math";
import { Banknote, AlertCircle } from "lucide-react";

interface CashPaymentProps {
  total: number;
  onConfirm: (amountReceived: number, change: number) => void;
  isProcessing?: boolean;
}

export function CashPayment({ total, onConfirm, isProcessing = false }: CashPaymentProps) {
  const [receivedStr, setReceivedStr] = useState<string>(total.toString());

  const receivedNum = parseFloat(receivedStr) || 0;
  const change = calculateChange(receivedNum, total);
  const isSufficient = receivedNum >= total;

  const denominations = [500, 1000, 2000, 5000];

  const handleKeypadPress = (val: string) => {
    if (val === "C") {
      setReceivedStr("0");
      return;
    }
    if (val === "BACK") {
      setReceivedStr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
      return;
    }
    if (val === ".") {
      if (!receivedStr.includes(".")) setReceivedStr((prev) => prev + ".");
      return;
    }
    setReceivedStr((prev) => (prev === "0" ? val : prev + val));
  };

  const setExact = () => {
    setReceivedStr(total.toString());
  };

  const setAmount = (amt: number) => {
    setReceivedStr(amt.toString());
  };

  return (
    <div className="space-y-4 select-none">
      {/* Received and Change Boxes */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block">
            Amount Received
          </span>
          <div className="text-xl font-bold text-slate-900 tabular-nums mt-0.5">
            {formatCurrency(receivedNum)}
          </div>
        </div>

        <div
          className={`p-3.5 border rounded-xl transition-colors ${
            isSufficient
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold tracking-wider block opacity-80">
            Change Due
          </span>
          <div className="text-xl font-bold tabular-nums mt-0.5">
            {formatCurrency(change)}
          </div>
        </div>
      </div>

      {!isSufficient && (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>Received amount is less than the sale total of {formatCurrency(total)}.</span>
        </div>
      )}

      {/* Quick Denominations */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          type="button"
          onClick={setExact}
          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0 transition-colors"
        >
          Exact Total
        </button>

        {denominations.map((denom) => (
          <button
            key={denom}
            type="button"
            onClick={() => setAmount(denom)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold shrink-0 transition-colors"
          >
            {formatCurrency(denom)}
          </button>
        ))}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-2">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "BACK"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleKeypadPress(k)}
            className="h-10 rounded-xl text-sm font-bold bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-800 transition-all flex items-center justify-center shadow-2xs"
          >
            {k === "BACK" ? "⌫" : k}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        disabled={!isSufficient || isProcessing}
        onClick={() => onConfirm(receivedNum, change)}
        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all ${
          !isSufficient || isProcessing
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-98"
        }`}
      >
        <Banknote className="w-4 h-4" />
        <span>{isProcessing ? "Completing Sale..." : `Complete Cash Sale (Change: ${formatCurrency(change)})`}</span>
      </button>
    </div>
  );
}
