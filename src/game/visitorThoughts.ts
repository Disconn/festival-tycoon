export const CONCERT_TOPLESS_THOUGHT = 'Ich feiere oben frei – die Menge rast!'
export const CONCERT_TOPLESS_CROWD_THOUGHT = 'Die zieht oben frei – die Stimmung explodiert!'

export type ThoughtVisitor = {
  id: string
  thought: string
  name: string
  state: string
  needs: { energy: number; fun: number }
  alcoholLevel: number
  motivation: number
  nausea: number
  crowding: number
  localAttractiveness: number
  localPartyMood: number
}

export type VisitorThoughtGroup<T extends ThoughtVisitor = ThoughtVisitor> = {
  thought: string
  count: number
  sample: T
  state: string
  energy: number
  alcohol: number
  motivation: number
  fun: number
  nausea: number
  crowding: number
  attractiveness: number
  party: number
}

export function groupVisitorsByThought<T extends ThoughtVisitor>(
  visitors: readonly T[],
): VisitorThoughtGroup<T>[] {
  const grouped = new Map<string, T[]>()
  for (const visitor of visitors) {
    const members = grouped.get(visitor.thought)
    if (members) members.push(visitor)
    else grouped.set(visitor.thought, [visitor])
  }
  return [...grouped.values()].map((members) => {
    const states = new Map<string, number>()
    let energy = 0
    let alcohol = 0
    let motivation = 0
    let fun = 0
    let nausea = 0
    let crowding = 0
    let attractiveness = 0
    let party = 0
    for (const member of members) {
      states.set(member.state, (states.get(member.state) ?? 0) + 1)
      energy += member.needs.energy
      alcohol += member.alcoholLevel
      motivation += member.motivation
      fun += member.needs.fun
      nausea += member.nausea
      crowding += member.crowding
      attractiveness += member.localAttractiveness
      party += member.localPartyMood
    }
    const state = [...states.entries()].sort(
      (left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'de'),
    )[0]![0]
    const count = members.length
    return {
      thought: members[0]!.thought,
      count,
      sample: members[0]!,
      state,
      energy: energy / count,
      alcohol: alcohol / count,
      motivation: motivation / count,
      fun: fun / count,
      nausea: nausea / count,
      crowding: crowding / count,
      attractiveness: attractiveness / count,
      party: party / count,
    }
  })
}
