"use client";

import React, { useState, useRef, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { calculateChange } from "@/lib/math";
import { Smartphone, AlertCircle, HelpCircle, Hash } from "lucide-react";

interface MPesaPaymentProps {
  total: number;
  onConfirm: (amountReceived: number, change: number, mpesaReference?: string) => void;
  isProcessing?: boolean;
}

export function MPesaPayment({ total, onConfirm, isProcessing = false }: MPesaPaymentProps) {
  // Amount received input (starts empty like Cash so the cashier enters what was sent/received)
  const [receivedStr, setReceivedStr] = useState<string>("");
  // Optional M-Pesa confirmation / reference code
  const [referenceCode, setReferenceCode] = useState<string>("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-focus input on mount
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

  const handleComplete = () => {
    if (!isSufficient || isProcessing) return;
    const cleanRef = referenceCode.trim().toUpperCase() || undefined;
    onConfirm(receivedNum, change, cleanRef);
  };

  return (
    <div className="space-y-3.5 select-none">
      {/* Received and Change Boxes */}
      <div className="grid grid-cols-2 gap-3">
        {/* M-PESA AMOUNT RECEIVED */}
        <div
          onClick={() => inputRef.current?.focus()}
          className="p-3 bg-emerald-50/40 border border-emerald-200 rounded-xl focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all cursor-text"
        >
          <label
            htmlFor="mpesa-received-input"
            className="text-[10px] text-emerald-800 uppercase font-bold tracking-wider block"
          >
            M-Pesa Amount
          </label>
          <div className="flex items-center mt-0.5">
            <span className="text-xl font-bold text-emerald-600/70 mr-1 select-none">KSh</span>
            <input
              id="mpesa-received-input"
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={receivedStr}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9.]/g, "");
                setReceivedStr(val);
              }}
              placeholder="0.00"
              className="w-full bg-transparent text-xl font-bold text-zinc-900 tabular-nums outline-none placeholder:text-zinc-300"
            />
          </div>
        </div>

        {/* CHANGE DUE */}
        <div
          className={`p-3 border rounded-xl transition-colors ${
            hasEnteredAmount && isSufficient
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-zinc-50 border-zinc-200 text-zinc-400"
          }`}
        >
          <span className="text-[10px] uppercase font-bold tracking-wider block opacity-80">
            Change Due
          </span>
          <div
            className={`text-xl font-bold tabular-nums mt-0.5 ${
              hasEnteredAmount && isSufficient ? "text-emerald-700" : "text-zinc-400"
            }`}
          >
            {formatCurrency(change)}
          </div>
        </div>
      </div>

      {/* OPTIONAL M-PESA REFERENCE CODE FIELD */}
      <div className="p-3 bg-zinc-50 border border-zinc-200 rounded-xl space-y-1">
        <label
          htmlFor="mpesa-ref-input"
          className="text-[11px] font-bold text-zinc-700 flex items-center justify-between"
        >
          <span className="flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-emerald-600" />
            Transaction Ref / Code
          </span>
          <span className="text-[10px] text-zinc-400 font-normal uppercase tracking-wider">Optional</span>
        </label>
        <input
          id="mpesa-ref-input"
          type="text"
          value={referenceCode}
          onChange={(e) => setReferenceCode(e.target.value.toUpperCase())}
          placeholder="e.g. QJD7839X"
          className="w-full bg-white border border-zinc-300 rounded-lg px-3 py-2 text-xs font-mono font-bold text-zinc-900 tracking-wider placeholder:font-sans placeholder:font-normal placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
        />
        <p className="text-[10px] text-zinc-500">
          Reflects on the receipt, sales ledger, and customer payment record.
        </p>
      </div>

      {/* Guidance and Validation Banners */}
      {!hasEnteredAmount ? (
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 bg-zinc-100/70 border border-zinc-200 p-2 rounded-lg">
          <HelpCircle className="w-4 h-4 shrink-0 text-zinc-500" />
          <span>Enter M-Pesa amount received from the customer.</span>
        </div>
      ) : !isSufficient ? (
        <div className="flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 p-2 rounded-lg">
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
          className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 text-xs font-semibold shrink-0 transition-colors active:scale-95 cursor-pointer"
        >
          Exact Total ({formatCurrency(total)})
        </button>

        {denominations.map((denom) => (
          <button
            key={denom}
            type="button"
            onClick={() => setAmount(denom)}
            className="px-3 py-1.5 rounded-lg bg-zinc-100 hover:bg-zinc-200 border border-zinc-200 text-zinc-700 text-xs font-semibold shrink-0 transition-colors active:scale-95 cursor-pointer"
          >
            {formatCurrency(denom)}
          </button>
        ))}
      </div>

      {/* Numeric Keypad */}
      <div className="grid grid-cols-3 gap-1.5">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "BACK"].map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => handleKeypadPress(k)}
            className="h-9 rounded-lg text-sm font-bold bg-white hover:bg-zinc-50 active:scale-95 border border-zinc-200 text-zinc-800 transition-all flex items-center justify-center shadow-2xs cursor-pointer"
          >
            {k === "BACK" ? "⌫" : k}
          </button>
        ))}
      </div>

      {/* Submit Button */}
      <button
        type="button"
        disabled={!isSufficient || isProcessing}
        onClick={handleComplete}
        className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all ${
          !isSufficient || isProcessing
            ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-98 cursor-pointer"
        }`}
      >
        <Smartphone className="w-4 h-4" />
        <span>
          {isProcessing
            ? "Completing Sale..."
            : !hasEnteredAmount
            ? "Enter M-Pesa Amount"
            : !isSufficient
            ? "Insufficient Amount"
            : `Complete M-Pesa Sale (Change: ${formatCurrency(change)})`}
        </span>
      </button>
    </div>
  );
}
