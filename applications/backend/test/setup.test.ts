import { describe, it, expect } from 'vitest'

describe('Project Setup', () => {
  it('should have Effect installed correctly', async () => {
    const { Effect } = await import('effect')
    expect(Effect).toBeDefined()
  })
})
