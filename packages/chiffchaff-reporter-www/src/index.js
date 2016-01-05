'use strict'

import Reporter from 'chiffchaff-reporter'
import Promise from 'bluebird'
import Bottleneck from 'bottleneck'
import EventRegistry from 'event-registry'
import express from 'express'
import socketIo from 'socket.io'
import defaults from 'defaults'
import open from 'open'
import path from 'path'
import http from 'http'

export default class WwwReporter extends Reporter {
  constructor (options) {
    super()
    this._options = defaults(options, {
      hostname: '127.0.0.1',
      port: 0,
      updateInterval: 250,
      closeTimeout: 500
    })
    this._lastData = []
    this._connections = []
    this._disposed = false
    this._limiter = new Bottleneck(1, this._options.updateInterval)
    this._boundReport = this._scheduledReport.bind(this)
    this._events = new EventRegistry()
  }

  start () {
    this._createApp()
    this._createServer()
    this._createIo()
    return this._listen()
      .then(() => Promise.all([this._openBrowser(), this._waitForConnection()]))
  }

  report (data) {
    if (this._disposed) {
      throw new Error('Reporter disposed')
    }
    this._lastData = data
    this._scheduleReport()
  }

  dispose () {
    return new Promise(resolve => {
      this._disposed = true
      this._scheduleReport()
      resolve()
    })
  }

  _scheduleReport () {
    this._limiter.schedule(this._boundReport)
  }

  _scheduledReport () {
    return new Promise(resolve => {
      this._io.emit('data', this._lastData)
      resolve()
    }).then(() => this._disposed && this._completeDisposal())
  }

  _completeDisposal () {
    return new Promise(resolve => {
      this._limiter.stopAll()
      this._io.emit('end')
      this._io.close()
      this._server.close()
      this._events.clear()
      resolve()
    })
      .delay(this._options.closeTimeout)
      .then(() => {
        this._closeAllConnections()
        this._limiter = null
        this._app = null
        this._server = null
        this._io = null
        this._events = null
      })
  }

  _closeAllConnections () {
    for (const conn of this._connections) {
      conn.destroy()
    }
    this._connections.length = 0
  }

  _createApp () {
    const root = path.resolve(__dirname, '..')
    this._app = express()
    this._app.use(express.static(path.resolve(root, 'public')))
  }

  _createServer () {
    this._server = http.Server(this._app)
    this._events.on(this._server, 'connection', conn => {
      this._connections.push(conn)
      this._events.once(conn, 'close', () => this._onClose(conn))
    })
  }

  _createIo () {
    this._io = socketIo(this._server, {serveClient: false})
    this._events.on(this._io.sockets, 'connection',
      socket => this._onConnection(socket))
  }

  _listen () {
    return Promise.promisify(this._server.listen).call(this._server,
      this._options.port, this._options.hostname)
  }

  _openBrowser () {
    const port = this._server.address().port
    open(`http://127.0.0.1:${port}/`)
  }

  _waitForConnection () {
    return new Promise(resolve => this._io.on('connection', resolve))
  }

  _onConnection (socket) {
    socket.emit('init', this._lastData)
  }

  _onClose (conn) {
    conn.destroy()
    const idx = this._connections.indexOf(conn)
    if (idx >= 0) {
      this._connections.splice(idx, 1)
    }
  }
}
