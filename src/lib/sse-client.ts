/**
 * SSE (Server-Sent Events) Client
 * Handles real-time streaming connections for task logs and progress updates
 */

export type SSEMessageHandler = (data: unknown) => void
export type SSEErrorHandler = (error: Event) => void
export type SSEConnectionHandler = () => void

export interface SSEClientOptions {
  onMessage?: SSEMessageHandler
  onError?: SSEErrorHandler
  onOpen?: SSEConnectionHandler
  onClose?: SSEConnectionHandler
  reconnect?: boolean
  reconnectInterval?: number
  maxReconnectAttempts?: number
}

export class SSEClient {
  private eventSource: EventSource | null = null
  private url: string
  private options: Required<SSEClientOptions>
  private reconnectAttempts = 0
  private isClosed = false

  constructor(url: string, options: SSEClientOptions = {}) {
    this.url = url
    this.options = {
      onMessage: options.onMessage ?? (() => {}),
      onError: options.onError ?? (() => {}),
      onOpen: options.onOpen ?? (() => {}),
      onClose: options.onClose ?? (() => {}),
      reconnect: options.reconnect ?? true,
      reconnectInterval: options.reconnectInterval ?? 3000,
      maxReconnectAttempts: options.maxReconnectAttempts ?? 5,
    }
  }

  connect(): void {
    if (this.eventSource) {
      return // Already connected
    }

    try {
      this.eventSource = new EventSource(this.url)
      this.setupEventHandlers()
    } catch (error) {
      console.error('[SSEClient] Failed to create EventSource:', error)
      this.options.onError(error as Event)
    }
  }

  private setupEventHandlers(): void {
    if (!this.eventSource) return

    this.eventSource.onopen = () => {
      console.log('[SSEClient] Connection opened:', this.url)
      this.reconnectAttempts = 0
      this.options.onOpen()
    }

    this.eventSource.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data)
        this.options.onMessage(data)
      } catch (error) {
        console.warn('[SSEClient] Failed to parse message:', event.data)
        this.options.onMessage(event.data)
      }
    }

    this.eventSource.onerror = (error: Event) => {
      console.error('[SSEClient] Connection error:', error)
      
      // Check if connection is closed
      if (this.eventSource?.readyState === EventSource.CLOSED) {
        console.log('[SSEClient] Connection closed by server')
        this.handleReconnect()
      }
      
      this.options.onError(error)
    }
  }

  private handleReconnect(): void {
    if (this.isClosed || !this.options.reconnect) {
      return
    }

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      console.error('[SSEClient] Max reconnect attempts reached')
      this.options.onClose()
      return
    }

    this.reconnectAttempts++
    console.log(
      `[SSEClient] Reconnecting (attempt ${this.reconnectAttempts}/${this.options.maxReconnectAttempts})...`
    )

    setTimeout(() => {
      this.eventSource = null
      this.connect()
    }, this.options.reconnectInterval)
  }

  close(): void {
    this.isClosed = true
    
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    
    this.options.onClose()
  }

  isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }

  getState(): number | null {
    return this.eventSource?.readyState ?? null
  }
}

/**
 * Create and manage SSE connection for task logs
 */
export function createTaskLogStream(
  streamUrl: string,
  onLog: (log: TaskLogEntry) => void,
  onError?: (error: Event) => void
): SSEClient {
  return new SSEClient(streamUrl, {
    onMessage: (data) => {
      // Parse log entry
      if (typeof data === 'object' && data !== null) {
        onLog(data as TaskLogEntry)
      }
    },
    onError,
    reconnect: true,
    maxReconnectAttempts: 3,
  })
}

/**
 * Create and manage SSE connection for task progress
 */
export function createTaskProgressStream(
  streamUrl: string,
  onProgress: (progress: TaskProgressUpdate) => void,
  onError?: (error: Event) => void
): SSEClient {
  return new SSEClient(streamUrl, {
    onMessage: (data) => {
      // Parse progress update
      if (typeof data === 'object' && data !== null) {
        onProgress(data as TaskProgressUpdate)
      }
    },
    onError,
    reconnect: true,
    maxReconnectAttempts: 3,
  })
}

// Type definitions for SSE data structures

export interface TaskLogEntry {
  timestamp: string
  level: 'debug' | 'info' | 'warning' | 'error' | 'success'
  message: string
  source?: string
  details?: Record<string, unknown>
}

export interface TaskProgressUpdate {
  task_id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress?: number
  message?: string
  current_step?: string
  total_steps?: number
  error?: string
  result?: unknown
}

export interface InversionProgressData {
  iteration?: number
  total_iterations?: number
  current_dc?: number
  variance_reduction?: number
  rms_misfit?: number
  best_solution?: {
    strike: number
    dip: number
    rake: number
    magnitude: number
  }
}
