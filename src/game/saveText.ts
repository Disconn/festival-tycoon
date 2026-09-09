export function encodeSaveText(json: string): string {
  const bytes = new TextEncoder().encode(json)
  const chunks: string[] = []
  for (let i = 0; i < bytes.length; i += 8192) chunks.push(String.fromCharCode(...bytes.subarray(i, i + 8192)))
  return btoa(chunks.join(''))
}

export function decodeSaveText(text: string): string {
  const binary = atob(text.replace(/\s/g, ''))
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, character => character.charCodeAt(0)))
}
