'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:AggregateTask')

import Task from 'chiffchaff'
import defaults from 'defaults'

const checkAndNormalizeWeights = (weights, count) => {
  if (weights.length !== count) {
    throw new Error(`Invalid weight array length: expected ${count}, got ${weights.length}`)
  }
  if (count === 0) {
    return weights
  }
  for (let w of weights) {
    if (typeof w !== 'number' || isNaN(w) || w < 0) {
      throw new Error(`Invalid weight: ${w}`)
    }
  }
  const total = weights.reduce((s, w) => s + w, 0)
  if (total === 0) {
    throw new Error('Total weight cannot be 0')
  }
  return weights.map(w => w / total)
}

const createDefaultWeights = num => {
  const weight = 1 / num
  const weights = []
  for (let i = 0; i < num; ++i) {
    weights.push(weight)
  }
  return weights
}

export default class AggregateTask extends Task {
  constructor (tasks, options) {
    super()
    this._tasks = tasks
    this._options = defaults(options, this.constructor._defaultOptions)
    this._options.weights = Array.isArray(this._options.weights) ?
      checkAndNormalizeWeights(this._options.weights, tasks.length) :
      createDefaultWeights(this._tasks.length)
  }

  static _defaultOptions () {
    return {}
  }

  _startAll () {
    throw new Error('Method is abstract')
  }

  _start () {
    this._initProgressArray()
    return this._startAll()
  }

  _initProgressArray () {
    this._progress = []
    for (let i = 0; i < this._tasks.length; ++i) {
      this._progress.push(0)
    }
    return this._progress
  }

  _startOne (idx) {
    return this._tasks[idx]
      .on('progress', (compl, total) => this._setProgress(idx, compl / total))
      .start()
      .then(res => {
        this._setProgress(idx, 1)
        return res
      })
  }

  _setProgress (idx, progress) {
    if (this._progress[idx] === progress) {
      debug(`${this} progress already at ${progress}`)
      return
    }
    this._progress[idx] = progress
    const weights = this._options.weights
    const total = this._progress.reduce((s, p, i) => s + p * weights[i], 0)
    debug(`${this} progress: ${this._progress}, weights: ${weights}, total: ${total}`)
    this._notify(total, 1)
  }

  toString () {
    return super.toString() + '<' +
      this._tasks.map(op => op.toString()).join(',') +
      '>'
  }
}
