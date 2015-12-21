'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:SpawnTask')

import Task from 'chiffchaff'
import EventRegistry from 'event-registry'
import defaults from 'defaults'
import spawn from 'win-spawn'
import Promise from 'bluebird'
import {Stream} from 'stream'

Promise.config({cancellation: true})

const toBuffer = data => (typeof data === 'string') ? new Buffer(data) : data

export default class SpawnTask extends Task {
  constructor (command, args, source, options) {
    super()
    this._command = command
    this._args = args
    this._source = source
    this._options = defaults(options, {
      env: process.env,
      captureStdout: false,
      captureStderr: false
    })
    this._proc = null
    this._stdout = new Buffer(0)
    this._stderr = new Buffer(0)
    this._piped = false
    this._eventRegistry = new EventRegistry()
  }

  get source () {
    return this._source
  }

  set source (src) {
    this._source = src
  }

  get command () {
    return this._command
  }

  set command (command) {
    this._command = command
  }

  get args () {
    return this._args
  }

  set args (args) {
    this._args = args
  }

  _start () {
    return new Promise((resolve, reject, onCancel) => {
      this._resolve = resolve
      this._reject = reject
      this._runCommand()
      this._addListeners()
      this._pipeSource()
      onCancel(() => debug(`Process ${this.command} cancelled`))
    })
  }

  _runCommand () {
    debug(`Running ${this.command} with args: ${this.args}`)
    this._proc = spawn(this.command, this.args, this._options)
    this._proc.stdout.setEncoding('utf8')
    this._proc.stderr.setEncoding('utf8')
  }

  _addListeners () {
    this._eventRegistry.once(this._proc, 'close', code => this._onClose(code))
    this._eventRegistry.once(this._proc, 'error', err => this._onError(err))
    if (this._options.captureStdout) {
      this._eventRegistry.on(this._proc.stdout, 'data', data => this._onStdout(data))
    }
    if (this._options.captureStderr) {
      this._eventRegistry.on(this._proc.stderr, 'data', data => this._onStderr(data))
    }
    this._eventRegistry.on(this._proc.stdin, 'error', err => this._onStdinError(err))
  }

  _pipeSource () {
    if (this._source instanceof Stream) {
      this._eventRegistry.on(this._source, 'error', err => this._onSourceError(err))
      this._source.pipe(this._proc.stdin)
      this._source.resume()
      this._piped = true
    }
  }

  _unpipeSource () {
    if (this._piped) {
      this._piped = false
      this._source.unpipe(this._proc.stdin)
    }
  }

  _onSourceError (err) {
    debug(`Process ${this.command} source error: ${err}`)
    this.emit('sourceError', err)
    this._unpipeSource()
  }

  _onStdinError (err) {
    debug(`Process ${this.command} stdin error: ${err}`)
    this.emit('stdinError', err)
    this._unpipeSource()
  }

  _onStdout (data) {
    debug(`Process ${this.command} stdout: ${data.length} bytes`)
    this._stdout = Buffer.concat([this._stdout, toBuffer(data)])
  }

  _onStderr (data) {
    debug(`Process ${this.command} stderr: ${data.length} bytes`)
    this._stderr = Buffer.concat([this._stderr, toBuffer(data)])
  }

  _onClose (code, signal) {
    debug(`Process ${this.command} exited with ${code}`)
    this._unpipeSource()
    if (code) {
      this._onError(new Error(`Process ${this.command} exited with ${code}`))
      return
    }
    debug(`Process ${this.command} completed`)
    this._resolve({stdout: this._stdout, stderr: this._stderr})
  }

  _onError (err) {
    debug(`Process ${this.command} error: ${err}`)
    debug(`Process ${this.command} stderr: ${this._stderr.toString()}`)
    this._unpipeSource()
    this._reject(err)
  }
}
