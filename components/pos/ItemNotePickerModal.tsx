"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, MessageSquare, Plus } from "lucide-react";
import { PresetNote } from "@/services/presetNotes.service";

interface ItemNotePickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  currentNotes: string;
  presetNotes: PresetNote[];
  onSave: (notes: string) => void;
}

export function ItemNotePickerModal({
  isOpen,
  onClose,
  itemName,
  currentNotes,
  presetNotes,
  onSave,
}: ItemNotePickerModalProps) {
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [customNote, setCustomNote] = useState("");
  const customRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      const existing = currentNotes
        ? currentNotes.split(" - ").map((n) => n.trim()).filter(Boolean)
        : [];
      setSelectedNotes(existing);
      setCustomNote("");
    }
  }, [isOpen, currentNotes]);

  if (!isOpen) return null;

  // Always add — multiple taps = multiple entries
  const addNote = (label: string) => {
    setSelectedNotes((prev) => [...prev, label]);
  };

  // Remove a single occurrence by its position in the array
  const removeNote = (index: number) => {
    setSelectedNotes((prev) => prev.filter((_, i) => i !== index));
  };

  const addCustom = () => {
    const trimmed = customNote.trim();
    if (trimmed) {
      setSelectedNotes((prev) => [...prev, trimmed]);
    }
    setCustomNote("");
    customRef.current?.focus();
  };

  const handleSave = () => {
    // Smart join: "/" acts as a bare separator — no " - " on either side
    const combined = selectedNotes.filter(Boolean).reduce((acc, note, i) => {
      if (i === 0) return note;
      if (note === "/") return acc + " /";          // no dash before "/"
      if (acc.endsWith("/")) return acc + " " + note; // no dash after "/"
      return acc + " - " + note;
    }, "");
    onSave(combined);
    onClose();
  };

  const handleClear = () => { onSave(""); onClose(); };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center select-none">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-xs" onClick={onClose} />

      {/* Modal — fixed height so grid never pushes down */}
      <div className="relative w-full sm:max-w-2xl h-[85dvh] sm:h-[75vh] flex flex-col bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden z-10 border border-zinc-200">

        {/* Header — purple gradient like the POS KOT modal */}
        <div className="px-4 py-3 bg-gradient-to-r from-purple-700 to-violet-700 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <MessageSquare className="w-5 h-5 text-purple-200 shrink-0" />
            <div className="min-w-0">
              <h3 className="text-sm font-black text-white">Items Notes</h3>
              <p className="text-[11px] text-purple-200 truncate">{itemName}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>

        {/* Body — fixed height split; left scrolls, right scrolls independently */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* LEFT: 5-column preset note tiles — scrolls independently */}
          <div className="flex-1 overflow-y-auto p-3 bg-zinc-50 min-h-0">
            {presetNotes.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full py-10 text-zinc-400">
                <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                <p className="text-sm font-semibold text-center">No preset notes yet</p>
                <p className="text-xs text-zinc-400 mt-1 text-center px-4">
                  Go to <strong>Settings → KOT Item Notes</strong> to add presets.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-5 gap-2">
                {presetNotes.map((pn, idx) => {
                  const isPurple = idx % 2 === 0;
                  return (
                    <button
                      key={pn.id}
                      type="button"
                      onClick={() => addNote(pn.label)}
                      className={`rounded-xl px-1 py-4 text-xs font-bold text-center transition-all active:scale-95 border-2 leading-tight ${
                        isPurple
                          ? "bg-violet-600 text-white border-violet-500 hover:bg-violet-500 shadow-sm"
                          : "bg-white text-zinc-800 border-zinc-300 hover:border-violet-400 hover:bg-violet-50 shadow-sm"
                      }`}
                    >
                      {pn.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT: Selected notes panel — wider so names don't get cut off */}
          <div className="w-52 shrink-0 border-l border-zinc-200 bg-white flex flex-col overflow-hidden min-h-0">
            {/* Column header */}
            <div className="grid grid-cols-2 px-3 py-2 bg-zinc-100 border-b border-zinc-200 text-xs font-black text-zinc-600 uppercase tracking-wide shrink-0">
              <span>Active</span>
              <span>Note</span>
            </div>
            {/* Selected list */}
            <div className="flex-1 overflow-y-auto divide-y divide-zinc-100">
              {selectedNotes.length === 0 ? (
                <div className="px-3 py-5 text-center text-xs text-zinc-400 font-medium">
                  Tap a note to add it
                </div>
              ) : (
                selectedNotes.map((note, idx) => (
                  <div key={idx} className="grid grid-cols-2 items-center px-3 py-3 min-h-[48px] hover:bg-amber-50 border-b border-zinc-100">
                    <button
                      type="button"
                      onClick={() => removeNote(idx)}
                      className="w-8 h-8 rounded-lg bg-amber-500 hover:bg-red-600 text-white text-sm font-black flex items-center justify-center transition-colors shadow-sm"
                      title="Remove"
                    >
                      ✕
                    </button>
                    <span className="text-sm font-bold text-zinc-800 break-words pl-2 leading-snug">{note}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-3 py-3 bg-white border-t border-zinc-200 flex items-center gap-2 shrink-0">
          {/* Custom note */}
          <input
            ref={customRef}
            type="text"
            maxLength={100}
            value={customNote}
            onChange={(e) => setCustomNote(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustom(); } }}
            placeholder="Type a custom note..."
            className="flex-1 bg-zinc-50 border border-zinc-300 rounded-xl px-3 py-2 text-sm font-medium text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-300"
          />
          <button
            type="button"
            onClick={addCustom}
            disabled={!customNote.trim()}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-bold disabled:opacity-30 flex items-center gap-1 transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-4 h-4" />Add
          </button>
          <div className="w-px h-6 bg-zinc-200 shrink-0" />
          <button type="button" onClick={onClose} className="px-3 py-2 text-sm font-bold text-zinc-600 hover:bg-zinc-100 rounded-xl transition-colors shrink-0">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-black shadow-sm active:scale-95 transition-all shrink-0 whitespace-nowrap"
          >
            {selectedNotes.length > 0 ? `Save (${selectedNotes.length}) ✓` : "Save (No Notes)"}
          </button>
          {selectedNotes.length > 0 && (
            <button type="button" onClick={handleClear} className="text-sm font-bold text-red-500 hover:text-red-700 shrink-0">
              Clear
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
