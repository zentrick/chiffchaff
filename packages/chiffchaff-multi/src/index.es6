'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:MapTask')

import Task from 'chiffchaff'
import Promise from 'bluebird'
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

const createProgressArray = num => {
  const progress = []
  for (let i = 0; i < num; ++i) {
    progress.push(0)
  }
  return progress
}

export default class MapTask extends Task {
  constructor (tasks, options) {
    super()
    this._tasks = tasks
    this._options = defaults(options, {
      cancel: false,
      concurrency: 1,
      size: Array.isArray(this._tasks) ? this._tasks.length : 0,
      weights: null
    })
    this._options.weights = Array.isArray(this._options.weights) ?
      checkAndNormalizeWeights(this._options.weights, this.size) :
      createDefaultWeights(this.size)
  }

  get size () {
    return (this._options.size < 0) ? this._tasks.length : this._options.size
  }

  _start () {
    this._progress = createProgressArray(this._tasks.length)
    return Promise.map(this._options.weights,
      (_, idx) => this._startOne(idx),
      {concurrency: this._options.concurrency})
  }

  _startOne (idx) {
    const task = this._getNext(idx)
    const promise = task.start()
    if (this._options.cancel && !promise.isCancellable()) {
      return Promise.reject(new Error(`Promise from ${task} is not cancellable`))
    }
    task.on('progress', (compl, total) => this._setProgress(idx, compl / total))
    const promiseWithCompletion = promise
      .then(res => {
        this._setProgress(idx, 1)
        return res
      })
    if (!this._options.cancel) {
      return promiseWithCompletion
    }
    return promiseWithCompletion
      .catch(err => {
        if (!(err instanceof Promise.CancellationError)) {
          debug(`Error from auto-cancelling ${this}: ${err}`)
        }
        this._cancelAll()
        throw err
      })
  }

  _getNext (idx) {
    return Array.isArray(this._tasks) ? this._tasks[idx] :
      this._tasks.next().value
  }

  _setProgress (idx, progress) {
    if (this._progress[idx] === progress) {
      debug(`${this} progress already at ${progress}`)
      return
    }
    this._progress[idx] = progress
    this._reportProgress()
  }

  _reportProgress () {
    const weights = this._options.weights
    const total = this._progress.reduce((s, p, i) => s + p * weights[i], 0)
    debug(`${this} progress: ${this._progress}, weights: ${weights}, total: ${total}`)
    this._notify(total, 1)
  }

  _cancelAll () {
    const promises = this._tasks.map(t => t.promise).filter(p => !!p)
    debug(`Trying to cancel ${promises.length} promise(s)`)
    promises.forEach(promise => promise.cancel())
  }

  toString () {
    return super.toString() + '<' +
      this._tasks.map(task => task.toString()).join(',') +
      '>'
  }
}
