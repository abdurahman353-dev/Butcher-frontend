"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Trash2, GripVertical, ToggleLeft, ToggleRight, Loader2, MessageSquare, CheckCircle2, X } from "lucide-react";
import { presetNotesService, PresetNote } from "@/services/presetNotes.service";

export function PresetNotesManager() {
  const [notes, setNotes] = useState<PresetNote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [newLabel, setNewLabel] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadNotes();
  }, []);

  const loadNotes = async () => {
    setIsLoading(true);
    try {
      const data = await presetNotesService.getAll();
      setNotes(data);
    } catch (e) {
      console.error("Failed to load preset notes:", e);
    } finally {
      setIsLoading(false);
    }
  };

  const flash = (msg: string) => {
    setSavedMsg(msg);
    setTimeout(() => setSavedMsg(""), 2500);
  };

  const handleAdd = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setIsAdding(true);
    try {
      const created = await presetNotesService.create({ label, is_active: true });
      setNotes((prev) => [...prev, created]);
      setNewLabel("");
      flash(`"${label}" added!`);
      setTimeout(() => inputRef.current?.focus(), 50);
    } catch (e: any) {
      console.error("Add note error:", e);
    } finally {
      setIsAdding(false);
    }
  };

  const handleToggle = async (note: PresetNote) => {
    try {
      const updated = await presetNotesService.update(note.id, { is_active: !note.is_active });
      setNotes((prev) => prev.map((n) => (n.id === note.id ? updated : n)));
    } catch (e) {
      console.error("Toggle note error:", e);
    }
  };

  const handleDelete = async (note: PresetNote) => {
    if (!window.confirm(`Delete note "${note.label}"? Waiters won't see it anymore.`)) return;
    try {
      await presetNotesService.remove(note.id);
      setNotes((prev) => prev.filter((n) => n.id !== note.id));
      flash(`"${note.label}" deleted.`);
    } catch (e) {
      console.error("Delete note error:", e);
    }
  };

  const activeNotes = notes.filter((n) => n.is_active);
  const inactiveNotes = notes.filter((n) => !n.is_active);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-black text-zinc-900">KOT Item Notes</h2>
          </div>
          <p className="text-[11px] text-zinc-500 mt-0.5">
            Preset notes that all staff can tap when adding notes to order items (e.g. "Without Sugar", "No Ice", "Extra Spicy").
          </p>
        </div>
        {savedMsg && (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg animate-in fade-in">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {savedMsg}
          </span>
        )}
      </div>

      {/* Add new note input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          maxLength={100}
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); }}
          placeholder='e.g. Without Sugar, No Ice, Extra Spicy...'
          className="flex-1 bg-white border border-zinc-300 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-300 shadow-xs"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={!newLabel.trim() || isAdding}
          className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black disabled:opacity-40 flex items-center gap-1.5 transition-all active:scale-95 shadow-xs"
        >
          {isAdding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
          Add Note
        </button>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-zinc-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading notes...</span>
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-8 border-2 border-dashed border-zinc-200 rounded-xl">
          <MessageSquare className="w-8 h-8 text-zinc-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-zinc-500">No preset notes yet</p>
          <p className="text-xs text-zinc-400 mt-1">Type a note above and click "Add Note" to create the first one.</p>
        </div>
      ) : (
        <>
          {/* Active notes grid — shows exactly how they'll appear on the POS */}
          {activeNotes.length > 0 && (
            <div className="space-y-2">
              <div className="text-[10px] font-black text-zinc-500 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                Active — visible to all staff on the POS ({activeNotes.length})
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {activeNotes.map((note, idx) => (
                  <div
                    key={note.id}
                    className={`relative rounded-xl px-3 py-3 text-xs font-bold text-center shadow-sm border-2 group ${
                      idx % 2 === 0
                        ? "bg-purple-100 border-purple-200 text-purple-900"
                        : "bg-white border-zinc-200 text-zinc-800"
                    }`}
                  >
                    <span className="block truncate">{note.label}</span>
                    {/* Hover actions */}
                    <div className="absolute inset-0 rounded-xl bg-black/5 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1.5 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleToggle(note)}
                        title="Deactivate (hide from staff)"
                        className="p-1 rounded-lg bg-amber-500 text-white hover:bg-amber-600 transition-colors"
                      >
                        <ToggleLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(note)}
                        title="Delete permanently"
                        className="p-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-zinc-400">Hover a tile to deactivate or delete it.</p>
            </div>
          )}

          {/* Inactive notes list */}
          {inactiveNotes.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-zinc-100">
              <div className="text-[10px] font-black text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-zinc-300 inline-block" />
                Inactive — hidden from staff ({inactiveNotes.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {inactiveNotes.map((note) => (
                  <div
                    key={note.id}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-100 border border-zinc-200 text-[11px] font-semibold text-zinc-500"
                  >
                    <span>{note.label}</span>
                    <button
                      type="button"
                      onClick={() => handleToggle(note)}
                      title="Re-activate"
                      className="text-emerald-600 hover:text-emerald-800 transition-colors"
                    >
                      <ToggleRight className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(note)}
                      title="Delete"
                      className="text-zinc-400 hover:text-red-600 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
