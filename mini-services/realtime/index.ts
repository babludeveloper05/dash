/**
 * Project Delta — Socket.io real-time service.
 *
 * Port: 3003
 *
 * Handles real-time features that the HTTP API can't:
 *  - Live class events (join/leave, viewer count, chat messages)
 *  - Leaderboard live updates (rank changes, score updates)
 *  - Doubt community notifications (new answers, upvotes)
 *  - Presence (who's online in your batch/cohort)
 *
 * The Next.js frontend connects via io("/?XTransformPort=3003") so the
 * Caddy gateway routes it to this service.
 *
 * No persistence — this is ephemeral event routing. Persistent data goes
 * through the FastAPI sync endpoint.
 */
import { createServer } from 'http'
import { Server } from 'socket.io'

const PORT = 3003

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'delta-realtime', port: PORT }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Delta Realtime Service')
})

const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:81', 'http://127.0.0.1:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
})

// --- Connection auth middleware ---
// Every connection must provide a valid JWT token. Reject unauthenticated connections.
io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace('Bearer ', '')
  if (!token) {
    return next(new Error('Authentication required'))
  }

  // Verify the JWT by calling the FastAPI backend
  try {
    const res = await fetch('http://localhost:8000/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) {
      return next(new Error('Invalid or expired token'))
    }
    const data = await res.json()
    socket.data.userId = data.user.id
    socket.data.userName = data.user.name
    next()
  } catch {
    // If FastAPI is down, allow connection (graceful degradation)
    console.warn('[socket] could not verify token (backend down?) — allowing connection')
    next()
  }
})

// --- Connection tracking ---
const onlineUsers = new Map<string, { name: string; batch: string; socketId: string }>()

io.on('connection', (socket) => {
  console.log(`[socket] connected: ${socket.id} (user: ${socket.data.userId || 'unverified'})`)

  // --- Auth/handshake ---
  socket.on('user:join', (user: { id: string; name: string; batch: string }) => {
    socket.data.userId = user.id
    socket.data.name = user.name
    socket.data.batch = user.batch
    onlineUsers.set(user.id, { name: user.name, batch: user.batch, socketId: socket.id })

    // Join batch room for batch-scoped events
    socket.join(`batch:${user.batch}`)
    io.to(`batch:${user.batch}`).emit('presence:update', {
      online: Array.from(onlineUsers.values()).filter((u) => u.batch === user.batch).length,
    })
  })

  // --- Live class events ---
  socket.on('live:join', (sessionId: string) => {
    socket.join(`live:${sessionId}`)
    const viewers = io.sockets.adapter.rooms.get(`live:${sessionId}`)?.size ?? 0
    io.to(`live:${sessionId}`).emit('live:viewers', { sessionId, viewers })
  })

  socket.on('live:leave', (sessionId: string) => {
    socket.leave(`live:${sessionId}`)
    const viewers = io.sockets.adapter.rooms.get(`live:${sessionId}`)?.size ?? 0
    io.to(`live:${sessionId}`).emit('live:viewers', { sessionId, viewers })
  })

  socket.on('live:chat', ({ sessionId, message, userName }) => {
    io.to(`live:${sessionId}`).emit('live:chat', {
      sessionId,
      message,
      userName,
      timestamp: Date.now(),
    })
  })

  // --- Leaderboard ---
  socket.on('leaderboard:subscribe', () => {
    socket.join('leaderboard')
  })

  socket.on('leaderboard:score', ({ userId, score, name }) => {
    // Broadcast to everyone subscribed to leaderboard updates
    io.to('leaderboard').emit('leaderboard:update', { userId, score, name })
  })

  // --- Doubts community ---
  socket.on('doubts:subscribe', () => {
    socket.join('doubts')
  })

  socket.on('doubts:new', (doubt) => {
    io.to('doubts').emit('doubts:new', doubt)
  })

  socket.on('doubts:answer', ({ doubtId, answer }) => {
    io.to('doubts').emit('doubts:answer', { doubtId, answer })
  })

  socket.on('doubts:upvote', ({ doubtId, upvotes }) => {
    io.to('doubts').emit('doubts:upvote', { doubtId, upvotes })
  })

  // --- Disconnect ---
  socket.on('disconnect', () => {
    const userId = socket.data.userId
    if (userId) {
      onlineUsers.delete(userId)
      const batch = socket.data.batch
      if (batch) {
        io.to(`batch:${batch}`).emit('presence:update', {
          online: Array.from(onlineUsers.values()).filter((u) => u.batch === batch).length,
        })
      }
    }
    console.log(`[socket] disconnected: ${socket.id}`)
  })
})

httpServer.listen(PORT, () => {
  console.log(`[delta-realtime] Socket.io running on http://localhost:${PORT}`)
})
