'use strict'

import Task from 'chiffchaff'
import MultiTask from 'chiffchaff-multi'
import PipeTask from 'chiffchaff-pipe'

export default class ConcatTask extends Task {
  constructor (destination) {
    super()
    this._streams = []
    this._destination = destination
  }

  add (stream) {
    this._streams.push(stream)
  }

  _start () {
    const tasks = this._streams.map(str => new PipeTask(str, this._destination))
    return new MultiTask(tasks).start()
  }
}
