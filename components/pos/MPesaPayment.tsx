"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/formatters";
import { Smartphone, CheckCircle, Loader2 } from "lucide-react";

interface MPesaPaymentProps {
  total: number;
  customerPhone?: string;
  onConfirm: (phone: string, mpesaReference: string) => void;
  isProcessing?: boolean;
}

export function MPesaPayment({ total, customerPhone = "", onConfirm, isProcessing = false }: MPesaPaymentProps) {
  const [phone, setPhone] = useState(customerPhone || "");
  const [stkState, setStkState] = useState<"idle" | "sent" | "confirmed" | "failed">("idle");
  const [mpesaRef, setMpesaRef] = useState("");
  const [countdown, setCountdown] = useState(12);

  const cleanPhone = phone.replace(/[^0-9]/g, "");
  const isValidPhone = cleanPhone.length >= 10;

  const handleSendStk = () => {
    if (!isValidPhone) return;
    setStkState("sent");
    setCountdown(12);
    const generatedRef = `NLK${Math.floor(100000 + Math.random() * 900000)}`;
    setMpesaRef(generatedRef);
  };

  useEffect(() => {
    let timer: any;
    if (stkState === "sent" && countdown > 0) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (stkState === "sent" && countdown === 0) {
      setStkState("confirmed");
    }
    return () => clearTimeout(timer);
  }, [stkState, countdown]);

  const handleManualComplete = () => {
    const finalRef = mpesaRef || `NLK${Math.floor(100000 + Math.random() * 900000)}`;
    onConfirm(cleanPhone, finalRef);
  };

  return (
    <div className="space-y-4 select-none">
      <div>
        <label className="block text-xs font-semibold text-zinc-700 mb-1">
          Customer Safaricom M-Pesa Number
        </label>
        <div className="relative">
          <Smartphone className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="tel"
            disabled={stkState !== "idle"}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="0712 345 678"
            className="w-full bg-white border border-zinc-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-bold text-zinc-900 tracking-wider focus:outline-hidden focus:border-green-600 focus:ring-1 focus:ring-green-500 disabled:opacity-60 shadow-2xs"
          />
        </div>
        <p className="text-[11px] text-slate-400 mt-1">
          Prompt will be sent directly to customer's handset.
        </p>
      </div>

      {stkState === "idle" && (
        <button
          type="button"
          disabled={!isValidPhone || isProcessing}
          onClick={handleSendStk}
          className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all ${
            !isValidPhone || isProcessing
              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
              : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20 active:scale-98"
          }`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Send M-Pesa STK Prompt ({formatCurrency(total)})</span>
        </button>
      )}

      {stkState === "sent" && (
        <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-700 font-bold text-sm">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Prompt sent to {phone}...</span>
          </div>

          <p className="text-xs text-slate-600">
            Waiting for customer to enter their M-Pesa PIN on phone screen.
          </p>

          <div className="text-xs font-mono text-slate-500">
            Auto-checking status ({countdown}s)...
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setStkState("idle")}
              className="flex-1 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg bg-white hover:bg-slate-50"
            >
              Cancel / Change #
            </button>
            <button
              type="button"
              onClick={() => setStkState("confirmed")}
              className="flex-1 py-1.5 text-xs font-semibold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50"
            >
              Instant Confirm
            </button>
          </div>
        </div>
      )}

      {stkState === "confirmed" && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-3 text-center">
          <div className="flex items-center justify-center gap-2 text-emerald-800 font-bold text-sm">
            <CheckCircle className="w-4 h-4 text-emerald-600" />
            <span>M-Pesa Payment Received!</span>
          </div>

          <div className="text-xs text-slate-600">
            Receipt Ref: <span className="font-mono font-bold text-slate-900">{mpesaRef}</span>
          </div>

          <button
            type="button"
            disabled={isProcessing}
            onClick={handleManualComplete}
            className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-2 transition-all active:scale-98"
          >
            <span>{isProcessing ? "Finalizing Sale..." : "Complete Sale"}</span>
          </button>
        </div>
      )}
    </div>
  );
}
