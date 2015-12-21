'use strict'

import MultiTask from 'chiffchaff-multi'
import EventRegistry from 'event-registry'
import Node from './node'

export default class Reporter {
  constructor () {
    this._tasks = new Node()
    this._taskToParent = new Map()
  }

  acceptTask (task) {
    const reg = new EventRegistry()
    reg.once(task, 'start', () => {
      const parent = this._taskToParent.get(task) || this._tasks
      const node = parent.addChild(task)
      reg.on(task, 'progress', (completed, total) => {
        node.setProgress(completed, total)
        this._report()
      })
      if (task instanceof MultiTask) {
        reg.on(task, 'startOne', (subtask, index) => {
          this._taskToParent.set(subtask, node)
        })
      }
      reg.onceFin(task, 'end', err => {
        node.markEnded(err)
        this._report()
      })
    })
  }

  _report () {
    const obj = this._tasks.toJson()
    this.report(obj.children || [])
  }

  start () {
    throw new Error('Method is abstract')
  }

  report (data) {
    throw new Error('Method is abstract')
  }

  dispose () {
    throw new Error('Method is abstract')
  }
}
