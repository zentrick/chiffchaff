'use strict'

import Reporter from 'chiffchaff-reporter'
import Promise from 'bluebird'
import express from 'express'
import socketIo from 'socket.io'
import defaults from 'defaults'
import open from 'open'
import path from 'path'
import http from 'http'

export default class WWWReporter extends Reporter {
  constructor (options) {
    super()
    this._options = defaults(options, {port: 3000})
    this._lastData = []
  }

  start () {
    this._createApp()
    this._createServer()
    this._createIo()
    return this._listen()
      .then(() => Promise.all([this._openBrowser(), this._waitForConnection()]))
  }

  report (data) {
    this._lastData = data
    this._io.emit('data', data)
  }

  dispose () {
    return Promise.promisify(this._server.close).call(this._server)
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
