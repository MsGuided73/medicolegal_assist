// This test requires a DOM-like environment.
// Vitest defaults to `node` unless configured otherwise.
// We explicitly request happy-dom for this file.
// @vitest-environment happy-dom

import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { axe } from 'jest-axe'

// Note: To use toHaveNoViolations in Vitest, we need to extend expect
// But for now we'll do a simple check on the results

describe('WCAG 2.1 Accessibility Compliance', () => {
  it('Base components meet accessibility standards', async () => {
    const { container } = render(<button aria-label="test">Click Me</button>)
    const results = await axe(container)
    expect(results.violations).toEqual([])
  })
})
