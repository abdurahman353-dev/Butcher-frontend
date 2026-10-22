"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Customer } from "@/types";
import { X, Delete, UserPlus, Check, Search } from "lucide-react";

interface CustomerPickerModalProps {
  customers: Customer[];
  selectedCustomer: Customer | null;
  onSelect: (customer: Customer | null) => void;
  onClose: () => void;
  onOpenAddCustomer?: () => void;
  isWaiter?: boolean;
}

const LETTERS_ROWS = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P", "⌫"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["Z", "X", "C", "V", "B", "N", "M", "."],
  ["123", "SPACE", "CLEAR"],
];

const NUMBERS_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "⌫"],
  ["-", "/", ":", ";", "(", ")", "@", "&", "%"],
  [".", ",", "?", "!", "'"],
  ["ABC", "SPACE", "CLEAR"],
];

const WALK_IN_ID = "__WALK_IN__";

export function CustomerPickerModal({
  customers,
  selectedCustomer,
  onSelect,
  onClose,
  onOpenAddCustomer,
  isWaiter = false,
}: CustomerPickerModalProps) {
  const [search, setSearch] = useState("");
  const [isNumMode, setIsNumMode] = useState(false);
  const [pendingId, setPendingId] = useState<string>(
    selectedCustomer ? selectedCustomer.id.toString() : WALK_IN_ID
  );
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return customers;
    const q = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.address && c.address.toLowerCase().includes(q))
    );
  }, [customers, search]);

  const handleKey = (key: string) => {
    if (key === "⌫") {
      setSearch((p) => p.slice(0, -1));
      return;
    }
    if (key === "CLEAR") {
      setSearch("");
      return;
    }
    if (key === "SPACE") {
      setSearch((p) => p + " ");
      return;
    }
    if (key === "123") {
      setIsNumMode(true);
      return;
    }
    if (key === "ABC") {
      setIsNumMode(false);
      return;
    }
    setSearch((p) => p + key);
  };

  const handleSave = () => {
    if (pendingId === WALK_IN_ID) {
      onSelect(null);
    } else {
      const found = customers.find((c) => c.id.toString() === pendingId);
      onSelect(found ?? null);
    }
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "Enter") {
        handleSave();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [pendingId, customers]);

  const currentRows = isNumMode ? NUMBERS_ROWS : LETTERS_ROWS;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-2 sm:p-4 select-none">
      <div 
        className="flex flex-col w-full max-w-lg md:max-w-2xl lg:max-w-3xl xl:max-w-4xl bg-white rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl border border-zinc-200"
        style={{ height: "min(92vh, 760px)", maxHeight: "94vh" }}
      >
        {/* Header - Fixed height */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 md:py-3.5 bg-gradient-to-r from-emerald-700 to-emerald-600 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
              <Search className="w-4 h-4 md:w-5 md:h-5" />
            </div>
            <div>
              <h2 className="text-white font-black text-base md:text-xl tracking-wide leading-tight">
                Select Customer
              </h2>
              <p className="text-emerald-100 text-xs font-medium leading-none mt-0.5">
                Choose a customer or search below
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/80 hover:text-white p-1.5 md:p-2 rounded-xl hover:bg-white/10 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        {/* Search Bar - Fixed height */}
        <div className="px-4 sm:px-6 py-2 md:py-2.5 bg-zinc-100 border-b border-zinc-200 shrink-0 flex items-center gap-2.5">
          <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider shrink-0">
            Search
          </span>
          <div className="flex-1 relative flex items-center">
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or phone..."
              className="w-full bg-white border border-zinc-300 focus:border-emerald-600 rounded-xl px-3.5 py-1.5 md:py-2 text-sm md:text-base font-semibold text-zinc-800 placeholder-zinc-400 outline-none transition-all shadow-sm"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 text-zinc-400 hover:text-red-500 p-1.5 rounded-lg transition-colors active:scale-90"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Customer List - flex-1 min-h-0 so it expands/scrolls without overflowing the modal */}
        <div 
          ref={listRef}
          className="flex-1 min-h-0 overflow-y-auto overscroll-contain scroll-smooth bg-white divide-y divide-zinc-100 touch-pan-y"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {/* Walk-in Customer Option */}
          <button
            type="button"
            onClick={() => setPendingId(WALK_IN_ID)}
            className={`w-full text-left px-4 sm:px-6 py-3 transition-colors flex items-center justify-between text-sm md:text-base font-bold cursor-pointer ${
              pendingId === WALK_IN_ID
                ? "bg-emerald-50 text-emerald-800 border-l-4 border-emerald-600"
                : "text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Walk-in Customer</span>
            </div>
            {pendingId === WALK_IN_ID && (
              <span className="text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                <Check className="w-3 h-3 stroke-[3]" /> Selected
              </span>
            )}
          </button>

          {/* Add New Customer button (hidden for waiters) */}
          {!isWaiter && onOpenAddCustomer && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenAddCustomer();
              }}
              className="w-full text-left px-4 sm:px-6 py-3 text-sm md:text-base font-bold text-emerald-700 hover:bg-emerald-50/80 flex items-center gap-2.5 transition-colors cursor-pointer"
            >
              <div className="w-6 h-6 md:w-7 md:h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <UserPlus className="w-3.5 h-3.5 md:w-4 md:h-4" />
              </div>
              <span>+ Add New Customer</span>
            </button>
          )}

          {/* Filtered Customer rows */}
          {filtered.length === 0 ? (
            <div className="py-8 px-4 text-center text-zinc-400 text-sm md:text-base">
              {search ? `No customer matches "${search}"` : "No customers found"}
            </div>
          ) : (
            filtered.map((c) => {
              const isHighlighted = pendingId === c.id.toString();
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setPendingId(c.id.toString())}
                  className={`w-full text-left px-4 sm:px-6 py-2.5 md:py-3 transition-colors flex items-center justify-between gap-3 cursor-pointer ${
                    isHighlighted
                      ? "bg-emerald-50 text-emerald-900 font-bold border-l-4 border-emerald-600"
                      : "text-zinc-800 hover:bg-zinc-50 font-medium"
                  }`}
                >
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="font-bold text-sm md:text-base text-zinc-900 truncate">
                      {c.name}
                    </span>
                    {c.address && (
                      <span className="text-xs text-zinc-400 truncate">
                        {c.address}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {c.phone && (
                      <span className="text-zinc-600 font-mono text-xs md:text-sm font-semibold bg-zinc-100 px-2 py-0.5 rounded-lg">
                        {c.phone}
                      </span>
                    )}
                    {isHighlighted && (
                      <span className="text-xs bg-emerald-600 text-white px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-sm">
                        <Check className="w-3 h-3 stroke-[3]" /> Selected
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* On-screen Keyboard - shrink-0 to prevent cutoff, large buttons for thick fingers */}
        <div className="bg-zinc-900 px-2 sm:px-4 py-2 md:py-2.5 shrink-0 shadow-inner">
          {currentRows.map((row, ri) => (
            <div key={ri} className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 mb-1 md:mb-1.5 last:mb-0">
              {row.map((key) => {
                const isBackspace = key === "⌫";
                const isSpace = key === "SPACE";
                const isClear = key === "CLEAR";
                const isToggle = key === "123" || key === "ABC";

                return (
                  <button
                    key={key}
                    type="button"
                    onPointerDown={(e) => {
                      e.preventDefault();
                      handleKey(key);
                    }}
                    style={{ touchAction: "manipulation" }}
                    className={`
                      h-11 sm:h-12 md:h-13
                      rounded-xl 
                      text-sm sm:text-base md:text-lg font-black 
                      select-none transition-all active:scale-95 flex items-center justify-center cursor-pointer shadow-sm
                      ${
                        isSpace
                          ? "flex-[4] bg-zinc-700 hover:bg-zinc-600 text-white active:bg-zinc-500"
                          : isClear
                          ? "flex-[1.5] bg-red-700 hover:bg-red-600 text-white active:bg-red-500 text-xs sm:text-sm font-bold"
                          : isBackspace
                          ? "flex-[1.5] bg-amber-700 hover:bg-amber-600 text-white active:bg-amber-500"
                          : isToggle
                          ? "flex-[1.2] bg-zinc-700 hover:bg-zinc-600 text-white active:bg-zinc-500 text-xs sm:text-sm font-bold"
                          : "flex-1 min-w-[26px] sm:min-w-[34px] md:min-w-[44px] bg-zinc-800 hover:bg-zinc-700 text-white active:bg-emerald-600 active:text-white"
                      }
                    `}
                  >
                    {isBackspace ? (
                      <Delete className="w-5 h-5 md:w-6 md:h-6" />
                    ) : (
                      key
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer with Save and Cancel buttons - ALWAYS visible and never cut off */}
        <div className="px-4 sm:px-6 py-2.5 md:py-3 bg-zinc-100 border-t border-zinc-200 shrink-0 flex gap-3 md:gap-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-11 md:h-12 bg-red-600 hover:bg-red-700 text-white font-black rounded-xl transition-all active:scale-[0.98] text-sm md:text-base shadow cursor-pointer flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4 md:w-5 md:h-5" />
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 h-11 md:h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-xl transition-all active:scale-[0.98] text-sm md:text-base shadow cursor-pointer flex items-center justify-center gap-2"
          >
            <Check className="w-4 h-4 md:w-5 md:h-5 stroke-[3]" />
            Save Customer
          </button>
        </div>
      </div>
    </div>
  );
}
