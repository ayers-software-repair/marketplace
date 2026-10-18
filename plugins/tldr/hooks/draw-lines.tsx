// Copyright Ayers Electronics Inc. All rights reserved.

// Painted rows drawn as text: one Text per row, one coloured Text per segment. The mouse module and the still
// drawing both draw a table through this.

import type { ClientElements } from 'claude-code'

import type { Seg } from './paint'
import type { Theme } from './theme'
import { look } from './theme'

export function drawLines({ Box, Text }: Pick<ClientElements, 'Box' | 'Text'>, rows: Seg[][], th: Theme) {
  return (
    <Box flexDirection="column">
      {rows.map((segs, i) => (
        <Text key={'row' + i} wrap="truncate">
          {segs.map((s, j) => (
            <Text key={'seg' + j} {...look(s.tone, s.fx, th)}>
              {s.text}
            </Text>
          ))}
        </Text>
      ))}
    </Box>
  )
}
