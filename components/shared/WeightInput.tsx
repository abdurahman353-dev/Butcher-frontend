"use client";

import React, { useState, useEffect } from "react";
import { formatCurrency, formatWeight } from "@/lib/formatters";
import { calculateSubtotal, roundTo } from "@/lib/math";
import { Scale, Delete, Check } from "lucide-react";

interface WeightInputProps {
  productName: string;
  pricePerKg: number;
  availableStock: number;
  initialWeight?: number;
  onConfirm: (weightKg: number) => void;
  onCancel?: () => void;
}

export function WeightInput({
  productName,
  pricePerKg,
  availableStock,
  initialWeight = 1.0,
  onConfirm,
  onCancel,
}: WeightInputProps) {
  const [weightStr, setWeightStr] = useState<string>(initialWeight.toString());
  const [error, setError] = useState<string | null>(null);

  const numericWeight = parseFloat(weightStr) || 0;
  const subtotal = calculateSubtotal(numericWeight, pricePerKg);

  useEffect(() => {
    if (numericWeight > availableStock) {
      setError(`Exceeds available stock (${formatWeight(availableStock)})`);
    } else if (numericWeight <= 0) {
      setError("Enter a valid weight greater than 0");
    } else {
      setError(null);
    }
  }, [numericWeight, availableStock]);

  const handleKeypadPress = (val: string) => {
    if (val === "C") { setWeightStr("0"); return; }
    if (val === "BACK") {
      setWeightStr((prev) => (prev.length <= 1 ? "0" : prev.slice(0, -1)));
      return;
    }
    if (val === ".") {
      if (!weightStr.includes(".")) {
        setWeightStr((prev) => (prev === "0" ? "0." : prev + "."));
      }
      return;
    }
    setWeightStr((prev) => {
      if (prev === "0") return val;
      const parts = prev.split(".");
      if (parts.length > 1 && parts[1].length >= 3) return prev;
      return prev + val;
    });
  };

  const handleSetPreset = (presetKg: number) => setWeightStr(presetKg.toString());

  const handleConfirm = () => {
    if (numericWeight <= 0) { setError("Weight must be greater than 0"); return; }
    if (numericWeight > availableStock) {
      setError(`Cannot exceed available stock of ${formatWeight(availableStock)}`);
      return;
    }
    onConfirm(roundTo(numericWeight, 3));
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") { handleKeypadPress(e.key); }
      else if (e.key === ".") { handleKeypadPress("."); }
      else if (e.key === "Backspace") { handleKeypadPress("BACK"); }
      else if (e.key === "Enter") { e.preventDefault(); handleConfirm(); }
      else if (e.key === "Escape" && onCancel) { onCancel(); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [weightStr, numericWeight, availableStock]);

  return (
    <div className="bg-white border border-zinc-200 rounded-xl p-5 shadow-xl max-w-sm w-full text-zinc-900 select-none">
      {/* Header */}
      <div className="flex items-start justify-between border-b border-zinc-100 pb-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg">🥩</span>
            <h3 className="text-sm font-bold text-zinc-900">{productName}</h3>
          </div>
          <p className="text-xs text-zinc-500 mt-0.5">
            Unit price: <span className="text-green-700 font-bold">{formatCurrency(pricePerKg)}</span> / KG
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] uppercase text-zinc-400 font-medium">Available</span>
          <p className="text-xs font-bold text-zinc-700">{formatWeight(availableStock)}</p>
        </div>
      </div>

      {/* Weight + Subtotal display */}
      <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-3.5 mb-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-zinc-400 text-xs font-medium">
            <Scale className="w-3.5 h-3.5 text-green-600" />
            <span>Weighed Quantity</span>
          </div>
          <span className="text-xs text-zinc-400">Subtotal</span>
        </div>
        <div className="flex items-baseline justify-between">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold tabular-nums text-zinc-900">
              {numericWeight > 0 ? numericWeight.toFixed(3) : "0.000"}
            </span>
            <span className="text-sm font-bold text-zinc-400">KG</span>
          </div>
          <span className="text-2xl font-bold text-green-700 tabular-nums">
            {formatCurrency(subtotal)}
          </span>
        </div>
        {error && (
          <p className="text-xs text-red-600 mt-2 bg-red-50 border border-red-200 rounded px-2.5 py-1">
            ⚠ {error}
          </p>
        )}
      </div>

      {/* Quick presets */}
      <div className="grid grid-cols-4 gap-1.5 mb-3">
        {[0.25, 0.5, 1.0, 2.0].map((kg) => (
          <button
            key={kg}
            type="button"
            onClick={() => handleSetPreset(kg)}
            className="py-2 bg-white hover:bg-green-50 border border-zinc-200 rounded-lg text-xs font-semibold text-zinc-700 transition-colors"
          >
            {kg >= 1 ? `${kg} KG` : `${kg * 1000}g`}
          </button>
        ))}
      </div>

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-1.5 mb-4">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "BACK"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => handleKeypadPress(key)}
            className={`h-11 rounded-lg text-base font-bold border transition-all flex items-center justify-center active:scale-95 ${
              key === "BACK"
                ? "bg-red-50 hover:bg-red-100 border-red-200 text-red-600"
                : "bg-white hover:bg-zinc-50 border-zinc-200 text-zinc-800"
            }`}
          >
            {key === "BACK" ? <Delete className="w-4 h-4" /> : key}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-1/3 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 hover:bg-zinc-50 text-sm font-medium transition-colors"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!!error || numericWeight <= 0}
          className={`flex-1 py-2.5 rounded-lg text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            !!error || numericWeight <= 0
              ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              : "bg-green-600 hover:bg-green-700 active:scale-[0.98]"
          }`}
        >
          <Check className="w-4 h-4" />
          Add to Sale ({formatCurrency(subtotal)})
        </button>
      </div>
    </div>
  );
}
