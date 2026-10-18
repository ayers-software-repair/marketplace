// Copyright Ayers Electronics Inc. All rights reserved.

// Chip maths: the stacks a balance is drawn as, the bet a click or a key makes, and what a bet pays. A balance
// moves in halves (3:2 on an odd stake); a bet is whole chips, at least the table minimum and never more than
// the balance covers.

export const DENOMS = [1, 5, 25, 100] as const
export type Denom = (typeof DENOMS)[number]
export type Stack = { denom: Denom; count: number }

export const MIN_BET = 1

const isDenom = (n: number): n is Denom => (DENOMS as readonly number[]).includes(n)

// The rack a balance is drawn as, smallest chip first: five to nine ones, five to nine fives and four to seven
// twenty-fives where the balance holds that much, the rest in hundreds, so a click on any stack bets a real chip.
// `half` is true when the balance holds a half chip.
export function rack(amount: number): { stacks: Stack[]; half: boolean } {
  let left = Math.max(0, Math.floor(amount))
  const stacks: Stack[] = DENOMS.map((denom, i) => {
    const next = DENOMS[i + 1]
    let count = next === undefined ? Math.floor(left / denom) : (left % next) / denom
    if (next !== undefined && left - count * denom >= next) count += next / denom
    left -= count * denom

    return { denom, count }
  })

  return { stacks, half: amount - Math.floor(amount) >= 0.5 }
}

// The fewest chips that make a bet, largest at the bottom: how a bet pile is stacked.
export function pile(bet: number): Stack[] {
  let left = Math.max(0, Math.floor(bet))

  return [...DENOMS].reverse().map(denom => {
    const count = Math.floor(left / denom)
    left -= count * denom

    return { denom, count }
  })
}

// The whole chips a balance can stake.
export const maxBet = (chips: number) => Math.max(0, Math.floor(chips))

// A bet held to the table minimum and to what the balance covers; 0 only when the balance covers no bet.
export const clampBet = (bet: number, chips: number) => Math.min(Math.max(MIN_BET, Math.floor(bet)), maxBet(chips))

// One chip of a denomination onto the bet; refused (the bet unchanged) when the balance does not cover it.
export function addChip(bet: number, denom: number, chips: number): number {
  return isDenom(denom) && bet + denom <= maxBet(chips) ? bet + denom : bet
}

// The top chip of the bet pile back to the rack; the bet never goes below the minimum.
export function takeChip(bet: number): number {
  const top = pile(bet).filter(s => s.count > 0).pop()

  return top && bet - top.denom >= MIN_BET ? bet - top.denom : bet
}

// "+" and "-": the bet stepped by the smallest chip, held to the minimum and the balance.
export const stepBet = (bet: number, by: 1 | -1, chips: number) => clampBet(bet + by * DENOMS[0], chips)

// What a winning bet pays at `num` to `den`, rounded down to the half chip.
export const pays = (stake: number, num: number, den: number) => Math.floor(((stake * num) / den) * 2) / 2

// A balance as written: whole chips, with a half as "½".
export const money = (n: number) => (n % 1 >= 0.5 ? Math.floor(n) + '½' : String(Math.floor(n)))
