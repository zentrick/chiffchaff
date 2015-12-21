'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:MultiTask')

import Task from 'chiffchaff'
import Promise from 'bluebird'
import defaults from 'defaults'

Promise.config({cancellation: true})

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
    progress.push({done: false, completed: 0, total: -1})
  }
  return progress
}

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

export default class MultiTask extends Task {
  constructor (tasks = [], options = null) {
    super()
    this._tasks = tasks
    this._options = defaults(options, {
      cancel: false,
      concurrency: 1,
      size: -1,
      weights: null,
      ignoreWeights: false
    })
  }

  get options () {
    return this._options
  }

  get size () {
    return (this._options.size < 0) ? this._tasks.length : this._options.size
  }

  add (task) {
    if (!Array.isArray(this._tasks)) {
      throw new Error('Cannot add task')
    }
    this._tasks.push(task)
  }

  _start () {
    if (!this._options.ignoreWeights) {
      this._weights = Array.isArray(this._options.weights)
        ? checkAndNormalizeWeights(this._options.weights, this.size)
        : createDefaultWeights(this.size)
    }
    this._progress = createProgressArray(this.size)
    this._index = 0
    const options = {concurrency: this._options.concurrency}
    return Promise.map(this._progress, () => this._startOne(), options)
  }

  _startOne () {
    const idx = this._index++
    const task = this._getNext(idx)
    this.emit('startOne', task, idx)
    const promise = task.start()
    const onProgress = (compl, total) => this._setProgress(idx, compl, total)
    task.on('progress', onProgress)
    return promise
      .then(res => {
        this.emit('endOne', task, idx, null, res)
        task.removeListener('progress', onProgress)
        this._onComplete(idx)
        return res
      })
      .catch(err => {
        debug(`Error from ${task}: ${err}`)
        this.emit('endOne', task, idx, err)
        task.removeListener('progress', onProgress)
        if (this._options.cancel) {
          this._cancelAll()
        }
        throw err
      })
  }

  _getNext (idx) {
    return Array.isArray(this._tasks) ? this._tasks[idx]
      : this._tasks.next().value
  }

  _onComplete (idx) {
    this._progress[idx].done = true
    this._reportProgress()
  }

  _setProgress (idx, completed, total) {
    this._progress[idx].completed = completed
    this._progress[idx].total = total
    this._reportProgress()
  }

  _reportProgress () {
    const total = this._options.ignoreWeights
      ? this._computeAdaptiveProgress()
      : this._computeWeightedProgress()
    const pStr = JSON.stringify(this._progress)
    debug(`${this} progress: ${pStr}, weights: ${this._weights}, total: ${total}`)
    this._notify(total, 1)
  }

  _computeWeightedProgress () {
    return this._progress.reduce(
      (sum, {done, completed, total}, i) => {
        const progress = (done ? 1 : (total > 0) ? completed / total : 0)
        return sum + this._weights[i] * progress
      }, 0)
  }

  _computeAdaptiveProgress () {
    let totalCompleted = 0
    let grandTotal = 0
    let unstarted = 0
    this._progress.forEach(({completed, total}, i) => {
      if (total < 0) {
        ++unstarted
        return
      }
      totalCompleted += completed
      grandTotal += total
    })
    grandTotal = this.size / (this.size - unstarted) * grandTotal
    return totalCompleted / grandTotal
  }

  _cancelAll () {
    const promises = this._tasks.map(t => t.promise).filter(p => !!p)
    debug(`Trying to cancel ${promises.length} promise(s)`)
    promises.forEach(promise => promise.cancel())
  }

  toString () {
    return this.name + (Array.isArray(this._tasks)
      ? '<' + this._tasks.map(task => task.toString()).join(',') + '>'
      : '[' + this.size + ']')
  }
}
