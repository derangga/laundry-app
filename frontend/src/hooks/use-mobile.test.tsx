import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { useIsMobile } from './use-mobile'

const MOBILE_BREAKPOINT = 768

type ChangeListener = () => void

function mockViewport(width: number) {
  const listeners = new Set<ChangeListener>()

  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: window.innerWidth < MOBILE_BREAKPOINT,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: (_: string, cb: ChangeListener) => listeners.add(cb),
    removeEventListener: (_: string, cb: ChangeListener) =>
      listeners.delete(cb),
    dispatchEvent: vi.fn(),
  })) as unknown as typeof window.matchMedia

  setWidth(width)

  return {
    setWidth(next: number) {
      setWidth(next)
      act(() => {
        listeners.forEach((cb) => cb())
      })
    },
  }
}

function setWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('returns true when the viewport is narrower than the breakpoint', () => {
    mockViewport(500)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(true)
  })

  it('returns false when the viewport is at or above the breakpoint', () => {
    mockViewport(1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)
  })

  it('updates when the media query change event fires', () => {
    const viewport = mockViewport(1024)
    const { result } = renderHook(() => useIsMobile())
    expect(result.current).toBe(false)

    viewport.setWidth(400)
    expect(result.current).toBe(true)
  })
})
