'use strict'

import MultiTask from 'chiffchaff-multi'
import PipeTask from 'chiffchaff-pipe'
import defaults from 'defaults'
import EventRegistry from 'event-registry'

const toTaskIterator = (sources, destination) => (function * () {
  for (const source of sources) {
    yield new PipeTask(source, destination, {end: false})
  }
})()

export default class ConcatTask extends MultiTask {
  constructor (sources = null, destination = null, options = null) {
    super(null, defaults(options, {ignoreWeights: true, size: 0}))
    this._sources = sources
    this._destination = destination
  }

  get destination () {
    return this._destination
  }

  set destination (value) {
    this._destination = value
  }

  get size () {
    return super.size
  }

  set size (value) {
    this.options.size = value
  }

  _start () {
    const ending = new Promise((resolve, reject) => {
      const reg = new EventRegistry()
      reg.onceFin(this._destination, 'finish', resolve)
      reg.onceFin(this._destination, 'error', reject)
    })
    this._tasks = toTaskIterator(this._sources, this._destination)
    return super._start()
      .then(() => this._destination.end())
      .then(() => ending)
  }
}
