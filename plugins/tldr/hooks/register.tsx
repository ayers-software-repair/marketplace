// Copyright Ayers Electronics Inc. All rights reserved.

// One mod, two concerns: the TL;DR band and the /cards pane.

import type { Register } from 'claude-code'

import { registerBand } from './band'
import { registerCards } from './cards-pane'

export const register: Register = (on, options) => {
  registerBand(on, options)
  registerCards(on, options)
}
