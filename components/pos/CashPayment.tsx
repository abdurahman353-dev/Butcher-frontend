"use client";

import React, { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { calculateChange } from "@/lib/math";
import { Banknote, AlertCircle, HelpCircle } from "lucide-react";

interface CashPaymentProps {
  total: number;
  onConfirm: (amountReceived: number, change: number) => void;
  isProcessing?: boolean;
}

export function CashPayment({ total, onConfirm, isProcessing = false }: CashPaymentProps) {
  // Do NOT pre-fill or auto-enter the amount — start empty so the cashier enters the amount received
  const [receivedStr, setReceivedStr] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount so the user can immediately type
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const receivedNum = receivedStr === "" ? 0 : parseFloat(receivedStr) || 0;
  const change = receivedNum >= total ? calculateChange(receivedNum, total) : 0;
  const isSufficient = receivedNum >= total;
  const hasEnteredAmount = receivedStr.trim().length > 0;

  const denominations = [500, 1000, 2000, 5000];

  const handleKeypadPress = (val: string) => {
    if (val === "C") {
      setReceivedStr("");
      inputRef.current?.focus();
      return;
    }
    if (val === "BACK") {
      setReceivedStr((prev) => (prev.length <= 1 ? "" : prev.slice(0, -1)));
      inputRef.current?.focus();
      return;
    }
    if (val === ".") {
      if (!receivedStr.includes(".")) {
        setReceivedStr((prev) => (prev === "" ? "0." : prev + "."));
      }
      inputRef.current?.focus();
      return;
    }
    setReceivedStr((prev) => (prev === "0" ? val : prev + val));
    inputRef.current?.focus();
  };

  const setExact = () => {
    setReceivedStr(total.toString());
    inputRef.current?.focus();
  };

  const setAmount = (amt: number) => {
    setReceivedStr(amt.toString());
    inputRef.current?.focus();
  };

  return (
    <div className="space-y-4 select-none">
      {/* Received and Change Boxes */}
      <div className="grid grid-cols-2 gap-3">
        {/* AMOUNT RECEIVED: Interactive editable input & keypad display */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all cursor-text"
        >
          <label
            htmlFor="cash-received-input"
            className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider block"
          >
            Amount Received
          </label>
          <div className="flex items-center mt-0.5">
            <span className="text-xl font-bold text-slate-400 mr-1 select-none">KSh</span>
            <input
              id="cash-received-input"
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={receivedStr}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setReceivedStr(val);
              }}
              placeholder="0.00"
              className="w-full bg-transparent text-xl font-bold text-slate-900 tabular-nums outline-none placeholder:text-slate-300"
            />
          </div>
        </div>

        {/* CHANGE DUE */}
        <div
          className={`p-3.5 border rounded-xl transition-colors ${
            hasEnteredAmount && isSufficient
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-slate-50 border-slate-200 text-slate-400"
          }`}
        >
          <span className="text-[10px] uppercase font-semibold tracking-wider block opacity-80">
            Change Due
          </span>
          <div
            className={`text-xl font-bold tabular-nums mt-0.5 ${
              hasEnteredAmount && isSufficient ? "text-emerald-700" : "text-slate-400"
            }`}
          >
            {formatCurrency(change)}
          </div>
        </div>
      </div>

      {/* Guidance and Validation Banners */}
      {!hasEnteredAmount ? (
        <div className="flex items-center gap-1.5 text-xs text-slate-600 bg-slate-100/70 border border-slate-200 p-2.5 rounded-lg">
          <HelpCircle className="w-4 h-4 shrink-0 text-slate-500" />
          <span>Please enter the cash amount handed by the customer.</span>
        </div>
      ) : !isSufficient ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2.5 rounded-lg">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
          <span>
            Amount is {formatCurrency(total - receivedNum)} short of total ({formatCurrency(total)}).
          </span>
        </div>
      ) : null}

      {/* Quick Denominations */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={setExact}
          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0 transition-colors active:scale-95"
        >
          Exact Total ({formatCurrency(total)})
        </button>

        {denominations.map((denom) => (
          <button
            key={denom}
            type="button"
            onClick={() => setAmount(denom)}
            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold shrink-0 transition-colors active:scale-95"
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
            className="h-11 rounded-xl text-sm font-bold bg-white hover:bg-slate-50 active:scale-95 border border-slate-200 text-slate-800 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
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
        className={`w-full py-3.5 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all ${
          !isSufficient || isProcessing
            ? "bg-slate-200 text-slate-400 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-98 cursor-pointer"
        }`}
      >
        <Banknote className="w-4 h-4" />
        <span>
          {isProcessing
            ? "Completing Sale..."
            : !hasEnteredAmount
            ? "Enter Cash Amount"
            : !isSufficient
            ? "Insufficient Cash"
            : `Complete Cash Sale (Change: ${formatCurrency(change)})`}
        </span>
      </button>
    </div>
  );
}
