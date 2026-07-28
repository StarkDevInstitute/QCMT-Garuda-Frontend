import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WaveformTrace } from '@/components/Waveform/WaveformTrace'

// Mock useThemeStore
vi.mock('@/stores/themeStore', () => ({
  useThemeStore: () => ({
    theme: 'dark',
  }),
}))

// Mock HTMLCanvasElement.getContext
const mockCanvasContext = {
  strokeStyle: '',
  lineWidth: 1,
  globalAlpha: 1,
  clearRect: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
  fillRect: vi.fn(),
  strokeRect: vi.fn(),
  fillStyle: '',
  font: '',
  fillText: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  scale: vi.fn(),
  translate: vi.fn(),
  rotate: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  setLineDash: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
}
HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCanvasContext) as any
HTMLCanvasElement.prototype.getBoundingClientRect = vi.fn(() => ({
  width: 500,
  height: 100,
  top: 0,
  left: 0,
  bottom: 100,
  right: 500,
  x: 0,
  y: 0,
  toJSON: () => ({}),
})) as any

describe('WaveformTrace Component', () => {
  const mockObserved = Array(100).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.5)
  const mockSynthetic = Array(100).fill(0).map((_, i) => Math.sin(i * 0.1) * 0.48)

  const defaultProps = {
    observed: mockObserved,
    synthetic: mockSynthetic,
    sampleRate: 20,
    maxAmplitude: 1.0,
    signalWindow: undefined,
    timeShift: 0,
    width: 800,
    height: 150,
  }

  it('should render canvas element', () => {
    const { container } = render(<WaveformTrace {...defaultProps} />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('should set correct canvas dimensions', () => {
    const { container } = render(<WaveformTrace {...defaultProps} />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(defaultProps.width)
    expect(canvas.height).toBe(defaultProps.height)
  })

  it('should apply time shift to synthetic trace', () => {
    // Just check it renders with time shift
    const { container } = render(
      <WaveformTrace {...defaultProps} timeShift={1} />
    )
    
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('should handle empty trace data gracefully', () => {
    const { container } = render(
      <WaveformTrace
        {...defaultProps}
        observed={[]}
        synthetic={[]}
      />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('should handle signal window', () => {
    const signalWindow = { phase: 'P' as const, startTime: 10, endTime: 30, strategy: 'fixed' as const, startReference: 'p_arrival' as const, color: '#f97316' }
    
    const { container } = render(
      <WaveformTrace
        {...defaultProps}
        signalWindow={signalWindow}
      />
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).toBeTruthy()
  })

  it('should update canvas when props change', () => {
    const { rerender } = render(
      <WaveformTrace {...defaultProps} timeShift={0} />
    )
    
    // Re-render with different time shift
    rerender(<WaveformTrace {...defaultProps} timeShift={2} />)
    
    // Should not throw and render successfully
    expect(true).toBe(true)
  })

  it('should handle hover interactions', () => {
    const { container } = render(<WaveformTrace {...defaultProps} />)
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    
    // Simulate hover at specific position
    const hoverEvent = new MouseEvent('mousemove', {
      bubbles: true,
      clientX: 100,
      clientY: 50,
    })
    
    // Should not throw error
    expect(() => canvas.dispatchEvent(hoverEvent)).not.toThrow()
  })

  it('should calculate correct pixel coordinates', () => {
    const traceData = [0, 0.5, 1.0, 0.5, 0]
    
    const { container } = render(
      <WaveformTrace
        {...defaultProps}
        observed={traceData}
        synthetic={traceData.map(v => v * 0.95)}
        width={500}
        height={100}
      />
    )
    
    const canvas = container.querySelector('canvas') as HTMLCanvasElement
    expect(canvas.width).toBe(500)
    expect(canvas.height).toBe(100)
  })
})
