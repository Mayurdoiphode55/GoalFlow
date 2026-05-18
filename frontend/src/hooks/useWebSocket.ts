import { useEffect, useRef, useState, useCallback } from 'react'
import type { WSEvent } from '../types/api'

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'

export function useWebSocket(path: string = '/ws/dashboard') {
  const [events, setEvents] = useState<WSEvent[]>([])
  const [isConnected, setIsConnected] = useState(false)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectDelayRef = useRef(1000)

  const connect = useCallback(() => {
    try {
      const ws = new WebSocket(`${WS_URL}${path}`)
      wsRef.current = ws

      ws.onopen = () => {
        setIsConnected(true)
        reconnectDelayRef.current = 1000
      }

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as WSEvent
          setEvents((prev) => [data, ...prev].slice(0, 50))
        } catch {
          // ignore malformed messages
        }
      }

      ws.onclose = () => {
        setIsConnected(false)
        wsRef.current = null
        // Exponential backoff reconnect
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectDelayRef.current = Math.min(reconnectDelayRef.current * 2, 30000)
          connect()
        }, reconnectDelayRef.current)
      }

      ws.onerror = () => {
        ws.close()
      }
    } catch {
      // WebSocket not available
    }
  }, [path])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current)
      if (wsRef.current) wsRef.current.close()
    }
  }, [connect])

  return { events, isConnected }
}
