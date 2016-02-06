'use strict'

import Task from 'chiffchaff'
import Promise from 'bluebird'
import EventRegistry from 'event-registry'

Promise.config({cancellation: true})

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
    return new Promise((resolve, reject, onCancel) => {
      const reg = new EventRegistry()
      // If the destination stream is kept open, only await source completion
      if (this._options && this._options.end === false) {
        reg.onceFin(this._source, 'end', resolve)
      } else {
        reg.onceFin(this._destination, 'finish', resolve)
      }
      reg.onceFin(this._source, 'error', reject)
      reg.onceFin(this._destination, 'error', reject)
      this._source.pipe(this._destination, this._options)
      onCancel(() => this._source.unpipe(this._destination))
    })
  }
}
