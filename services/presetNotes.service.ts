import apiClient from "./api";

export interface PresetNote {
  id: number;
  label: string;
  is_active: boolean;
  sort_order: number;
}

export const presetNotesService = {
  /** Get active preset notes (for POS usage by any role) */
  async getActive(): Promise<PresetNote[]> {
    const res = await apiClient.get<{ data: PresetNote[] }>("/preset-notes");
    return res.data.data ?? [];
  },

  /** Get ALL preset notes including inactive (admin panel) */
  async getAll(): Promise<PresetNote[]> {
    const res = await apiClient.get<{ data: PresetNote[] }>("/preset-notes/all");
    return res.data.data ?? [];
  },

  /** Create a new preset note */
  async create(payload: { label: string; is_active?: boolean; sort_order?: number }): Promise<PresetNote> {
    const res = await apiClient.post<{ data: PresetNote }>("/preset-notes", payload);
    return res.data.data;
  },

  /** Update an existing preset note */
  async update(
    id: number,
    payload: { label?: string; is_active?: boolean; sort_order?: number }
  ): Promise<PresetNote> {
    const res = await apiClient.put<{ data: PresetNote }>(`/preset-notes/${id}`, payload);
    return res.data.data;
  },

  /** Delete a preset note */
  async remove(id: number): Promise<void> {
    await apiClient.delete(`/preset-notes/${id}`);
  },
};
