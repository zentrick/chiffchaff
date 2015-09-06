'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:Task')

import Promise from 'bluebird'
import {EventEmitter} from 'events'

let counter = 0

export default class Task extends EventEmitter {
  constructor () {
    super()
    this._id = ++counter
    this._swallowCancellationError = false
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
  }

  cancel (swallowError) {
    debug(`Cancelling ${this}`)
    this._swallowCancellationError = swallowError
    this._promise.cancel()
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
    if (err instanceof Promise.CancellationError) {
      this.emit('cancel', null)
      if (this._swallowCancellationError) {
        debug(`Swallowing cancellation error from ${this}`)
        this.emit('end', null, null)
        return
      }
    }
    debug(`Error from ${this}: ${err}`)
    this.emit('fail', err)
    this.emit('end', err, null)
    throw err
  }

  _notify (completed, total) {
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
