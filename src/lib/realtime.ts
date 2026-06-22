'use client'

import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

/**
 * useRealtime — Socket.io client hook.
 *
 * Connects to the real-time mini-service on port 3003 (via the Caddy gateway
 * with XTransformPort). Returns the socket instance + connection status.
 *
 * Events the app listens for:
 *  - leaderboard:update → re-fetch leaderboard
 *  - doubts:new / doubts:answer / doubts:upvote → update doubts feed
 *  - live:viewers / live:chat → update live class UI
 *  - presence:update → show who's online
 *
 * The socket is a singleton — one connection per app instance.
 */

let socket: Socket | null = null

export function useRealtime() {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (socket) {
      setConnected(socket.connected)
      return
    }

    socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 2000,
    })

    socket.on('connect', () => {
      console.log('[realtime] connected')
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[realtime] disconnected')
      setConnected(false)
    })

    return () => {
      // Don't disconnect on unmount — the socket is a singleton shared across
      // the whole app. It disconnects on page unload.
    }
  }, [])

  return { socket, connected }
}

/**
 * Emit a user:join event so the server knows who's online and can route
 * batch-scoped events (presence, leaderboard) to the right room.
 */
export function joinRealtime(user: { id: string; name: string; batch: string }) {
  if (socket?.connected) {
    socket.emit('user:join', user)
  }
}

/**
 * Subscribe to real-time leaderboard updates.
 * Returns a cleanup function.
 */
export function subscribeLeaderboard(onUpdate: (data: { userId: string; score: number; name: string }) => void) {
  if (!socket) return () => {}
  socket.emit('leaderboard:subscribe')
  socket.on('leaderboard:update', onUpdate)
  return () => socket?.off('leaderboard:update', onUpdate)
}

/**
 * Subscribe to real-time doubt notifications.
 */
export function subscribeDoubts(handlers: {
  onNew?: (doubt: unknown) => void
  onAnswer?: (data: { doubtId: string; answer: unknown }) => void
  onUpvote?: (data: { doubtId: string; upvotes: number }) => void
}) {
  if (!socket) return () => {}
  socket.emit('doubts:subscribe')
  if (handlers.onNew) socket.on('doubts:new', handlers.onNew)
  if (handlers.onAnswer) socket.on('doubts:answer', handlers.onAnswer)
  if (handlers.onUpvote) socket.on('doubts:upvote', handlers.onUpvote)
  return () => {
    if (handlers.onNew) socket?.off('doubts:new', handlers.onNew as never)
    if (handlers.onAnswer) socket?.off('doubts:answer', handlers.onAnswer as never)
    if (handlers.onUpvote) socket?.off('doubts:upvote', handlers.onUpvote as never)
  }
}
