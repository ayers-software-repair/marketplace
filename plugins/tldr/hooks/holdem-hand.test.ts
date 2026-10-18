// Copyright Ayers Electronics Inc. All rights reserved.

import { expect, test } from 'claude-code/testing'

import { cards } from './holdem-fixture'
import { best, compare } from './holdem-hand'

const beats = (a: string, b: string) => compare(best(cards(a)), best(cards(b)))

test('every category is found and named', () => {
  const names = [
    ['2S 5H 9D JC KS 3H 7D', 'High Card', 0],
    ['2S 2H 9D JC KS 3H 7D', 'Pair', 1],
    ['2S 2H 9D 9C KS 3H 7D', 'Two Pair', 2],
    ['2S 2H 2D 9C KS 3H 7D', 'Three of a Kind', 3],
    ['4S 5H 6D 7C 8S KH 2D', 'Straight', 4],
    ['2H 5H 9H JH KS 3H 7D', 'Flush', 5],
    ['2S 2H 2D 9C 9S 3H 7D', 'Full House', 6],
    ['2S 2H 2D 2C KS 3H 7D', 'Four of a Kind', 7],
    ['4S 5S 6S 7S 8S KH 2D', 'Straight Flush', 8],
    ['10H JH QH KH AH 2S 3D', 'Royal Flush', 8],
  ] as const
  for (const [hand, name, cat] of names) expect([best(cards(hand)).name, best(cards(hand)).cat]).toEqual([name, cat])
})

test('kickers decide pairs, two pair and high card in order', () => {
  expect(beats('AS AH KD 7C 4S', 'AD AC QD 7H 4H')).toBeGreaterThan(0)
  expect(beats('9S 9H 5D 5C KS', '9D 9C 5H 5S QH')).toBeGreaterThan(0)
  expect(beats('9S 9H 5D 5C 2S', '8D 8C 7H 7S AH')).toBeGreaterThan(0)
  expect(beats('KS JH 9D 7C 3S', 'KD JC 9H 7S 2H')).toBeGreaterThan(0)
  expect(best(cards('9S 9H 5D 5C 3S 3H KD')).score).toEqual([2, 9, 5, 13])
  expect(best(cards('9S 9H 5D 5C 3S 3H 2D')).score).toEqual([2, 9, 5, 3])
})

test('ace plays low only in the wheel, which is the lowest straight', () => {
  expect(best(cards('AS 2H 3D 4C 5S KH KD')).score).toEqual([4, 5])
  expect(beats('2S 3H 4D 5C 6S', 'AS 2H 3D 4C 5S')).toBeGreaterThan(0)
  expect(best(cards('AS 2S 3S 4S 5S')).name).toBe('Straight Flush')
  expect(best(cards('QS KH AD 2C 3S')).cat).toBe(0)
})

test('flush beats straight and two trips make the higher full house', () => {
  expect(beats('2H 5H 9H JH 3H', '10S JH QD KC AS')).toBeGreaterThan(0)
  expect(best(cards('8S 8H 8D 4C 4S 4H KD')).score).toEqual([6, 8, 4])
  expect(best(cards('2H 5H 9H JH 3H KH 7S')).score).toEqual([5, 13, 11, 9, 5, 3])
})

test('when the board plays both hands tie', () => {
  const board = '10S JS QS KS AS'
  expect(compare(best(cards(board + ' 2H 3D')), best(cards(board + ' 4C 5H')))).toBe(0)
  expect(compare(best(cards('2S 3H 7D 8C 9S JH QD')), best(cards('2S 3H 7D 8C 9S JH QD')))).toBe(0)
})
