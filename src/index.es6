'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:Task')

import Promise from 'bluebird'
import {EventEmitter} from 'events'

Promise.config({cancellation: true})

let counter = 0

export default class Task extends EventEmitter {
  constructor () {
    super()
    this._id = ++counter
    if (Task._reporter) {
      Task._reporter.acceptTask(this)
    }
  }

  static set reporter (value) {
    Task._reporter = value
  }

  get name () {
    return `${this.constructor.name}#${this._id}`
  }

  get promise () {
    return this._promise
  }

  start () {
    debug(`Starting ${this}`)
    this.emit('start')
    this._promise = this._start()
    return this._promise
      .then(res => this._onResolve(res), err => this._onReject(err))
      .finally(() => {
        if (this._promise.isCancelled()) {
          this._onCancel()
        }
      })
  }

  cancel () {
    debug(`Cancelling ${this}`)
    this._promise.cancel()
  }

  isCancelled () {
    return this._promise.isCancelled()
  }

  _start () {
    throw new Error('Method is abstract')
  }

  _onResolve (res) {
    debug(`${this} completed`)
    this.emit('done', res)
    this.emit('end', null, res)
    return res
  }

  _onReject (err) {
    debug(`Error from ${this}: ${err}`)
    this.emit('fail', err)
    this.emit('end', err, null)
    throw err
  }

  _onCancel () {
    debug(`${this} cancelled`)
    this.emit('cancel', null)
    this.emit('end', null, null)
  }

  _notify (completed, total) {
    if (!this._promise || !this._promise.isPending()) {
      debug(`Ignoring progress while ${this} not pending: ${completed}/${total}`)
      return
    }
    if (typeof total !== 'number' || isNaN(total) || total <= 0 ||
        typeof completed !== 'number' || isNaN(completed) || completed < 0 ||
        completed > total) {
      debug(`Ignoring invalid progress from ${this}: ${completed}/${total}`)
      return
    }
    debug(`Progress from ${this}: ${completed}/${total}`)
    this.emit('progress', completed, total)
  }

  toString () {
    return this.name
  }
}
