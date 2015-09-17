'use strict'

import Node from './node'

export default class Reporter {
  constructor () {
    this._tasks = new Node()
    this._taskToParent = new Map()
  }

  acceptTask (task) {
    let node = null
    task.on('start', () => {
      const parent = this._taskToParent.get(task) || this._tasks
      node = parent.addChild(task)
    })
    task.on('progress', (completed, total) => {
      node.setProgress(completed, total)
      this._report()
    })
    task.on('end', (err, res) => {
      node.markEnded(err)
      this._report()
    })
    task.on('startOne', (subtask, index) => {
      this._taskToParent.set(subtask, node)
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
