'use strict'

export default class Node {
  constructor (task) {
    this._task = task
    this._completed = 0
    this._total = 0
    this._error = null
    this._ended = false
    this._children = new Map()
  }

  get completed () {
    return this._completed
  }

  get total () {
    return this._total
  }

  get ended () {
    return this._ended
  }

  get error () {
    return this._error
  }

  addChild (task) {
    const node = new Node(task)
    this._children.set(task, node)
    return node
  }

  setProgress (completed, total) {
    this._completed = completed
    this._total = total
  }

  markEnded (error) {
    this._ended = true
    this._error = error
  }

  toJson () {
    const obj = {total: this._total}
    if (this._task) {
      obj.name = this._task.name
    }
    if (this._ended) {
      obj.ended = true
      if (this._error) {
        obj.error = this._error.toString()
      }
    } else {
      obj.completed = this._completed
    }
    const children = []
    for (let child of this._children.values()) {
      children.push(child.toJson())
    }
    if (children.length) {
      obj.children = children
    }
    return obj
  }
}
