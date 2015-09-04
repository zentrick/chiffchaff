'use strict'

import MultiTask from 'chiffchaff-multi'
import PipeTask from 'chiffchaff-pipe'

const generatePipeTasks = function * (sources, destination) {
  for (let source of sources) {
    yield new PipeTask(source, destination, {end: false})
  }
}

export default class ConcatTask extends MultiTask {
  constructor (sources, numSources, destination) {
    super(generatePipeTasks(sources, destination), {
      size: numSources,
      ignoreWeights: true
    })
    this._destination = destination
  }

  _start () {
    return super._start()
      .then(() => this._destination.end())
  }
}
