export const ENVIRONMENTS = {
  farmland: { name: 'Ackerland', detail: 'Weicher Acker mit Lehmstellen. Regen weicht den Boden stark auf; Entwässerung und Verdichtung sind wichtig.', color: 0x91805b, trees: .35 },
  desert: { name: 'Wüste', detail: 'Lockerer Sand, wenig Vegetation. Langsamer auf unbefestigten Flächen; geringe Nässebindung, aber Verdichtung für schwere Bauten nötig.', color: 0xd4bd83, trees: 0 },
  grassland: { name: 'Grasfläche', detail: 'Wiesenboden mit einzelnen Kiesflächen. Mittlere Regenempfindlichkeit; schwere Bauten brauchen vorbereiteten Untergrund.', color: 0x79a85f, trees: 1 },
  urban: { name: 'Stadtfläche', detail: 'Befestigter, entwässerter Untergrund. Hohe Tragfähigkeit, kaum Schlammeffekt und direkt für große Bauten geeignet.', color: 0x989d99, trees: 0 },
} as const
export type Environment = keyof typeof ENVIRONMENTS
