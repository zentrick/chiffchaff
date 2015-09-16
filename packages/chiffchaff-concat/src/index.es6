'use strict'

import MultiTask from 'chiffchaff-multi'
import PipeTask from 'chiffchaff-pipe'

export default class ConcatTask extends MultiTask {
  constructor (sources = [], destination = null) {
    super([], {ignoreWeights: true})
    this._sources = sources
    this._destination = destination
  }

  addSource (source) {
    this._sources.push(source)
  }

  set destination (dest) {
    this._destination = dest
  }

  _start () {
    for (let source of this._sources) {
      this.add(new PipeTask(source, this._destination, {end: false}))
    }
    return super._start()
      .then(() => this._destination.end())
  }
}
