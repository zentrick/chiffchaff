'use strict'

import Task from 'chiffchaff'
import Promise from 'bluebird'

class ListenerManager {
  constructor () {
    this._listeners = []
  }

  once (emitter, event, listener) {
    const wrapped = this._wrap(listener)
    emitter.once(event, wrapped)
    this._listeners.push({emitter, event, listener: wrapped})
  }

  _wrap (listener) {
    return (...args) => {
      listener.apply(null, args)
      this._cleanUp()
    }
  }

  _cleanUp () {
    for (let {emitter, event, listener} of this._listeners) {
      emitter.removeListener(event, listener)
    }
    this._listeners.length = 0
  }
}

export default class PipeTask extends Task {
  constructor (source, destination, options) {
    super()
    this._source = source
    this._destination = destination
    this._options = options
  }

  set source (src) {
    this._source = src
  }

  _start () {
    return new Promise((resolve, reject) => {
      const mgr = new ListenerManager()
      mgr.once(this._source, 'end', resolve)
      mgr.once(this._source, 'error', reject)
      mgr.once(this._destination, 'error', reject)
      const pass = this._source.pipe(this._destination, this._options)
      mgr.once(pass, 'error', reject)
    })
      .cancellable()
      .catch(Promise.CancellationError, err => {
        this._source.unpipe(this._destination)
        throw err
      })
  }
}
