'use strict'

import Task from 'chiffchaff'
import Promise from 'bluebird'
import EventRegistry from 'event-registry'

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
      const reg = new EventRegistry()
      reg.onceFin(this._source, 'end', resolve)
      reg.onceFin(this._source, 'error', reject)
      reg.onceFin(this._destination, 'error', reject)
      const pass = this._source.pipe(this._destination, this._options)
      reg.onceFin(pass, 'error', reject)
    })
      .cancellable()
      .catch(Promise.CancellationError, err => {
        this._source.unpipe(this._destination)
        throw err
      })
  }
}
