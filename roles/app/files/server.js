const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const fs = require('fs')
const path = require('path')

const app = express()
const server = http.createServer(app)
const wss = new WebSocket.Server({ noServer: true })
const rooms = {} // roomID: Set of sockets

// Serve frontend
app.use(express.static('public'))

// Serve same index.html for any /roomID
app.get('/:room', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url, `http://${req.headers.host}`)
  const roomID = url.pathname.slice(1) || 'default'

  wss.handleUpgrade(req, socket, head, ws => {
    ws.roomID = roomID
    if (!rooms[roomID]) rooms[roomID] = new Set()
    rooms[roomID].add(ws)

    // Load existing file content
    const filePath = path.join(__dirname, 'rooms', `${roomID}.js`)
    if (fs.existsSync(filePath)) {
      const code = fs.readFileSync(filePath, 'utf-8')
      ws.send(JSON.stringify({ type: 'init', code }))
    }

    ws.on('message', msg => {
      const data = JSON.parse(msg)

      // Save code to disk
      fs.writeFileSync(filePath, data.code)

      // Broadcast to room members
      rooms[roomID].forEach(client => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify({ type: 'update', code: data.code }))
        }
      })
    })

    ws.on('close', () => {
      rooms[roomID].delete(ws)
      if (rooms[roomID].size === 0) delete rooms[roomID]
    })
  })
})

server.listen(3000, () => {
  console.log('Server running at http://localhost:3000')
})
