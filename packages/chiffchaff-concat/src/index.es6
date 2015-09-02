'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:ConcatTask')

import BatchTask from 'chiffchaff-base-batch'
import Promise from 'bluebird'

export default class ConcatTask extends BatchTask {
  constructor (generator, size, destination) {
    super(generator, size)
    this._destination = destination
  }

  _startOne (stream, idx) {
    debug(`${this}: Reading ${idx + 1}/${this.size}`)
    return new Promise((resolve, reject) => {
      let total = 0
      stream
        .once('end', () => resolve(total))
        .once('error', reject)
        .pipe(this._destination, {end: false})
          .on('data', data => total += data.length)
          .once('error', reject)
    })
      .cancellable()
      .then(total => {
        debug(`${this}: Processed ${idx + 1}/${this.size}: ${total} bytes`)
        this._notifyOne(total, total)
      })
      .catch(err => {
        debug(`${this}: Error from ${idx + 1}/${this.size}: ${err}`)
        throw err
      })
  }
}
