export type ServerSaveSlot = { id: string; name: string; savedAt: number }
type StoredSaveSlot = ServerSaveSlot & { snapshot: string }

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) } })
  const payload = await response.json().catch(() => ({})) as T & { error?: string }
  if (!response.ok) throw new Error(payload.error ?? 'Lokaler Server antwortet nicht')
  return payload
}

export const listServerSaves = () => request<ServerSaveSlot[]>('/api/saves')
export const loadServerSave = (id: string) => request<StoredSaveSlot>(`/api/saves/${encodeURIComponent(id)}`)
export const saveServerSave = (name: string, snapshot: string, id?: string) => request<ServerSaveSlot>(id ? `/api/saves/${encodeURIComponent(id)}` : '/api/saves', {
  method: id ? 'PUT' : 'POST', body: JSON.stringify({ name, snapshot }),
})
export const deleteServerSave = (id: string) => request<{ ok: true }>(`/api/saves/${encodeURIComponent(id)}`, { method: 'DELETE' })
