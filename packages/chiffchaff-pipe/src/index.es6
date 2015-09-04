'use strict'

import Task from 'chiffchaff'
import Promise from 'bluebird'

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
      this._source
        .once('end', resolve)
        .once('error', reject)
      this._destination
        .once('error', reject)
      this._source.pipe(this._destination, this._options)
        .once('error', reject)
    })
      .cancellable()
      .catch(Promise.CancellationError, err => {
        this._source.unpipe(this._destination)
        throw err
      })
  }
}
