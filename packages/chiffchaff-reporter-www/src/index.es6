'use strict'

import Reporter from 'chiffchaff-reporter'
import Promise from 'bluebird'
import Bottleneck from 'bottleneck'
import express from 'express'
import socketIo from 'socket.io'
import defaults from 'defaults'
import open from 'open'
import path from 'path'
import http from 'http'

export default class WwwReporter extends Reporter {
  constructor (options) {
    super()
    this._options = defaults(options, {port: 3000, updateInterval: 250})
    this._lastData = []
    this._limiter = new Bottleneck(1, this._options.updateInterval)
    this._boundReport = this._scheduledReport.bind(this)
  }

  start () {
    this._createApp()
    this._createServer()
    this._createIo()
    return this._listen()
      .then(() => Promise.all([this._openBrowser(), this._waitForConnection()]))
  }

  report (data) {
    if (!this._lastData) {
      throw new Error('Reporter disposed')
    }
    this._lastData = data
    this._limiter.schedule(this._boundReport)
  }

  dispose () {
    return new Promise(resolve => {
      this._limiter = null
      this._app = null
      this._server.close()
      this._server = null
      this._lastData = null
      this._io = null
      resolve()
    })
  }

  _scheduledReport () {
    return new Promise(resolve => {
      if (this._lastData) {
        this._io.emit('data', this._lastData)
      }
      resolve()
    })
  }

  _createApp () {
    const root = path.resolve(__dirname, '..')
    this._app = express()
    this._app.use(express.static(path.resolve(root, 'public')))
  }

  _createServer () {
    this._server = http.Server(this._app)
  }

  _createIo () {
    this._io = socketIo(this._server)
    this._io.on('connection', socket => this._onConnection(socket))
  }

  _listen () {
    return Promise.promisify(this._server.listen).call(this._server, this._options.port)
  }

  _openBrowser () {
    open(`http://localhost:${this._options.port}/`)
  }

  _waitForConnection () {
    return new Promise(resolve => this._io.on('connection', resolve))
  }

  _onConnection (socket) {
    socket.emit('init', this._lastData)
  }
}
