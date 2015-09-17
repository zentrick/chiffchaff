'use strict'

import Task from 'chiffchaff'
import Promise from 'bluebird'
import EventRegistry from 'event-registry'

export default class PipeTask extends Task {
  constructor (source = null, destination = null, options = null) {
    super()
    this._source = source
    this._destination = destination
    this._options = options
  }

  set source (src) {
    this._source = src
  }

  set destination (dest) {
    this._destination = dest
  }

  _start () {
    return new Promise((resolve, reject) => {
      const reg = new EventRegistry()
      reg.onceFin(this._source, 'end', resolve)
      reg.onceFin(this._source, 'error', reject)
      reg.onceFin(this._destination, 'error', reject)
      this._source.pipe(this._destination, this._options)
    })
      .cancellable()
      .catch(Promise.CancellationError, err => {
        this._source.unpipe(this._destination)
        throw err
      })
  }
}
