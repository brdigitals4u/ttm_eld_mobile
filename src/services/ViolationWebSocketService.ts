/**
 * Violation WebSocket Service
 *
 * Manages WebSocket connection for real-time violation notifications.
 * Handles connection lifecycle, heartbeat, reconnection, and message routing.
 */

import { WEBSOCKET_CONFIG } from "@/api/constants"

export type ViolationPriority = "critical" | "high" | "medium" | "low"

export interface ViolationNotificationData {
  driver_id: string
  organization_id: string
  violation_id: string
  violation_type: string
  title: string
  message: string
  priority: ViolationPriority
  metadata: Record<string, any>
}

export interface ViolationResolvedData {
  driver_id: string
  violation_id: string
  violation_type: string
  resolved_at: string
  reason: string
}

export interface WebSocketMessage {
  type: "connected" | "ping" | "pong" | "violation_notification" | "violation_resolved" | "error"
  timestamp: string
  org_id?: string
  driver_id?: string
  data?: ViolationNotificationData | ViolationResolvedData | any
  message?: string
  code?: string
}

export type WebSocketEventType =
  | "connected"
  | "disconnected"
  | "error"
  | "violation"
  | "violation_resolved"

export interface WebSocketEvent {
  type: WebSocketEventType
  data?: any
  error?: Error
}

type EventListener = (event: WebSocketEvent) => void

class ViolationWebSocketService {
  private ws: WebSocket | null = null
  private url: string | null = null
  private reconnectTimeoutId: ReturnType<typeof setTimeout> | null = null
  private reconnectDelay: number = WEBSOCKET_CONFIG.RECONNECT_DELAY_INITIAL
  private isManualDisconnect: boolean = false
  private listeners: Set<EventListener> = new Set()
  private lastPingTimestamp: number = 0
  private connectionTimeoutId: ReturnType<typeof setTimeout> | null = null

  /**
   * Connect to WebSocket server
   */
  connect(organizationId: string, driverId: string, token: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log("🔌 WebSocket already connected")
      return
    }

    this.isManualDisconnect = false
    this.url = `${WEBSOCKET_CONFIG.BASE_URL}${WEBSOCKET_CONFIG.PATH}/${organizationId}?driver_id=${driverId}&token=${encodeURIComponent(token)}`

    console.log("🔌 Connecting to WebSocket:", this.url.replace(/token=[^&]+/, "token=***"))

    try {
      this.ws = new WebSocket(this.url)

      // Connection timeout
      this.connectionTimeoutId = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          console.error("❌ WebSocket connection timeout")
          this.ws?.close()
          this.handleReconnect()
        }
      }, WEBSOCKET_CONFIG.CONNECTION_TIMEOUT)

      this.ws.onopen = () => {
        console.log("✅ WebSocket connected")
        this.clearConnectionTimeout()
        this.reconnectDelay = WEBSOCKET_CONFIG.RECONNECT_DELAY_INITIAL
        this.emit({ type: "connected" })
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (error) {
          console.error("❌ Failed to parse WebSocket message:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("❌ WebSocket error:", error)
        this.clearConnectionTimeout()
        const errorObj = new Error("WebSocket connection error")
        this.emit({ type: "error", error: errorObj })
      }

      this.ws.onclose = (event) => {
        console.log("🔌 WebSocket closed:", event.code, event.reason)
        this.clearConnectionTimeout()
        this.ws = null

        if (!this.isManualDisconnect) {
          this.emit({ type: "disconnected" })
          this.handleReconnect()
        }
      }
    } catch (error) {
      console.error("❌ Failed to create WebSocket connection:", error)
      this.clearConnectionTimeout()
      this.emit({ type: "error", error: error as Error })
      this.handleReconnect()
    }
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    console.log("🔌 Disconnecting WebSocket...")
    this.isManualDisconnect = true
    this.clearReconnectTimeout()

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect")
      this.ws = null
    }

    this.emit({ type: "disconnected" })
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "connected":
        console.log("✅ WebSocket authenticated:", {
          org_id: message.org_id,
          driver_id: message.driver_id,
        })
        break

      case "ping":
        this.handlePing(message)
        break

      case "violation_notification":
        this.handleViolationNotification(message.data as ViolationNotificationData)
        break

      case "violation_resolved":
        this.handleViolationResolved(message.data as ViolationResolvedData)
        break

      case "error":
        this.handleError(message)
        break

      default:
        console.warn("⚠️ Unknown message type:", message.type)
    }
  }

  /**
   * Handle ping heartbeat - respond with pong
   */
  private handlePing(message: WebSocketMessage): void {
    this.lastPingTimestamp = Date.now()

    if (this.ws?.readyState === WebSocket.OPEN) {
      const pong: WebSocketMessage = {
        type: "pong",
        timestamp: new Date().toISOString(),
      }
      this.ws.send(JSON.stringify(pong))
      console.log("💓 Pong sent")
    }
  }

  /**
   * Handle violation notification
   */
  private handleViolationNotification(data: ViolationNotificationData): void {
    console.log("🚨 Violation notification received:", {
      violation_id: data.violation_id,
      type: data.violation_type,
      priority: data.priority,
    })

    this.emit({
      type: "violation",
      data,
    })
  }

  /**
   * Handle violation resolved
   */
  private handleViolationResolved(data: ViolationResolvedData): void {
    console.log("✅ Violation resolved:", {
      violation_id: data.violation_id,
      type: data.violation_type,
      reason: data.reason,
    })

    this.emit({
      type: "violation_resolved",
      data,
    })
  }

  /**
   * Handle error message
   */
  private handleError(message: WebSocketMessage): void {
    console.error("❌ WebSocket error message:", message.message, message.code)

    const error = new Error(message.message || "WebSocket error")

    // Handle authentication errors
    if (message.code === "AUTH_ERROR") {
      this.disconnect()
      this.emit({
        type: "error",
        error,
        data: { code: "AUTH_ERROR" },
      })
      return
    }

    this.emit({
      type: "error",
      error,
    })
  }

  /**
   * Handle reconnection with exponential backoff
   */
  private handleReconnect(): void {
    if (this.isManualDisconnect) {
      return
    }

    this.clearReconnectTimeout()

    console.log(`🔄 Reconnecting in ${this.reconnectDelay}ms...`)

    this.reconnectTimeoutId = setTimeout(() => {
      if (!this.isManualDisconnect && this.url) {
        // Extract connection params from URL
        const urlMatch = this.url.match(/\/ws\/violations\/([^?]+)\?driver_id=([^&]+)&token=(.+)/)
        if (urlMatch) {
          const [, orgId, driverId, token] = urlMatch
          this.connect(orgId, driverId, decodeURIComponent(token))
        }
      }
    }, this.reconnectDelay)

    // Exponential backoff
    this.reconnectDelay = Math.min(
      this.reconnectDelay * WEBSOCKET_CONFIG.RECONNECT_DELAY_MULTIPLIER,
      WEBSOCKET_CONFIG.RECONNECT_DELAY_MAX,
    )
  }

  /**
   * Clear reconnection timeout
   */
  private clearReconnectTimeout(): void {
    if (this.reconnectTimeoutId) {
      clearTimeout(this.reconnectTimeoutId)
      this.reconnectTimeoutId = null
    }
  }

  /**
   * Clear connection timeout
   */
  private clearConnectionTimeout(): void {
    if (this.connectionTimeoutId) {
      clearTimeout(this.connectionTimeoutId)
      this.connectionTimeoutId = null
    }
  }

  /**
   * Subscribe to WebSocket events
   */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener)

    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener)
    }
  }

  /**
   * Emit event to all listeners
   */
  private emit(event: WebSocketEvent): void {
    this.listeners.forEach((listener) => {
      try {
        listener(event)
      } catch (error) {
        console.error("❌ Error in WebSocket event listener:", error)
      }
    })
  }

  /**
   * Get connection status
   */
  getConnectionStatus(): "connecting" | "connected" | "disconnected" | "error" {
    if (!this.ws) {
      return "disconnected"
    }

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting"
      case WebSocket.OPEN:
        return "connected"
      case WebSocket.CLOSING:
      case WebSocket.CLOSED:
        return "disconnected"
      default:
        return "error"
    }
  }
}

// Export singleton instance
export const violationWebSocketService = new ViolationWebSocketService()
