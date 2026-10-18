// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import { addChip, clampBet, maxBet, money, pays, pile, rack, stepBet, takeChip } from './chips'
import { betSprites, rackSprites } from './betting'
import { chipRow, chipStack } from './layout'

const sum = (stacks: { denom: number; count: number }[]) => stacks.reduce((a, s) => a + s.denom * s.count, 0)

test('a balance racks into stacks of every chip, smallest first, adding up to its whole chips', () => {
  expect(rack(100).stacks).toEqual([
    { denom: 1, count: 5 },
    { denom: 5, count: 9 },
    { denom: 25, count: 2 },
    { denom: 100, count: 0 },
  ])
  for (const n of [0, 1, 4, 7, 23, 99, 100, 137, 250, 1000, 4321]) expect(sum(rack(n).stacks)).toBe(n)
  expect(rack(1000).stacks.map(s => s.count)).toEqual([5, 9, 6, 8])
  expect(rack(137.5).half).toBe(true)
  expect(sum(rack(137.5).stacks)).toBe(137)
  expect(rack(-5).stacks.every(s => s.count === 0)).toBe(true)
})

test('a bet pile is the fewest chips, largest first', () => {
  expect(pile(131)).toEqual([
    { denom: 100, count: 1 },
    { denom: 25, count: 1 },
    { denom: 5, count: 1 },
    { denom: 1, count: 1 },
  ])
})

test('a chip onto the bet is refused past the balance; the top chip comes back; the minimum holds', () => {
  expect(addChip(5, 25, 100)).toBe(30)
  expect(addChip(5, 100, 50)).toBe(5)
  expect(addChip(5, 7, 100)).toBe(5)
  expect(addChip(49, 1, 49.5)).toBe(49)
  expect(takeChip(30)).toBe(25)
  expect(takeChip(126)).toBe(125)
  expect(takeChip(1)).toBe(1)
})

test('the bet is held between the minimum and the balance, and steps by the smallest chip', () => {
  expect(clampBet(500, 40)).toBe(40)
  expect(clampBet(0, 40)).toBe(1)
  expect(clampBet(5, 0.5)).toBe(0)
  expect(maxBet(37.5)).toBe(37)
  expect(stepBet(5, 1, 100)).toBe(6)
  expect(stepBet(1, -1, 100)).toBe(1)
  expect(stepBet(40, 1, 40)).toBe(40)
})

test('payouts round down to the half chip and money writes the half', () => {
  expect(pays(5, 3, 2)).toBe(7.5)
  expect(pays(3, 3, 2)).toBe(4.5)
  expect(pays(7, 1, 2)).toBe(3.5)
  expect(pays(10, 8, 1)).toBe(80)
  expect(money(7.5)).toBe('7½')
  expect(money(12)).toBe('12')
})

test('a chip stack is as tall as its count up to its cap, each chip its denomination between edges', () => {
  expect(chipRow(1).text).toBe('( 1 )')
  expect(chipRow(25).text).toBe('(25 )')
  expect(chipRow(100).text).toBe('(100)')
  expect(chipRow(5).tone).toBe('chip5')
  expect(chipStack(25, 12, 6).length).toBe(6)
  expect(chipStack(25, 3, 6).length).toBe(3)
  expect(chipStack(25, 3, 6).every(r => r.text === '(25 )')).toBe(true)
})

test('the rack and the bet pile are drawn as pressable stacks within their rows', () => {
  const r = rackSprites(100, 0, 0, 4, true)
  expect(r[0]!.rows![0]!.text.startsWith('CHIPS 100')).toBe(true)
  const fives = r.find(s => s.id === 'chip:5')!
  expect(fives.hot).toBe(true)
  expect(fives.h).toBe(4)
  expect(fives.y + fives.h).toBe(5)
  expect(r.some(s => s.id === 'chip:100')).toBe(false)
  expect(rackSprites(100, 0, 0, 4, false).find(s => s.id === 'chip:5')!.hot).toBe(false)
  const b = betSprites(30, 0, 0, 4, true)
  const chips = b.find(s => s.id === 'bet')!
  expect(chips.rows!.map(x => x.text)).toEqual(['( 5 )', '(25 )'])
  expect(chips.y + chips.h).toBe(4)
  expect(b[0]!.y).toBe(4)
  expect(b[0]!.rows![0]!.text.trim()).toBe('BET 30')
})
