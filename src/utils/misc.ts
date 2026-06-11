export const makeId = () => Math.random().toString(36).slice(2, 10)

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max)

export const escapeXml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
