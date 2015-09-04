'use strict'

import _debug from 'debug'
const debug = _debug('chiffchaff:MultiTask')

import Task from 'chiffchaff'
import Promise from 'bluebird'
import defaults from 'defaults'

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
    progress.push({completed: 0, total: -1})
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
  constructor (tasks, options) {
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
      this._weights = Array.isArray(this._options.weights) ?
        checkAndNormalizeWeights(this._options.weights, this.size) :
        createDefaultWeights(this.size)
    }
    this._progress = createProgressArray(this._tasks.length)
    this._index = 0
    const options = {concurrency: this._options.concurrency}
    return Promise.map(this._weights, () => this._startOne(), options)
      .cancellable()
  }

  _startOne () {
    const idx = this._index++
    const task = this._getNext(idx)
    const promise = task.start()
    if (this._options.cancel && !promise.isCancellable()) {
      return Promise.reject(new Error(`Promise from ${task} is not cancellable`))
    }
    task.on('progress', (compl, total) => this._setProgress(idx, compl, total))
    return promise
      .then(res => {
        this._onComplete(idx)
        return res
      })
      .catch(err => {
        debug(`Error from ${task}: ${err}`)
        if (this._options.cancel) {
          this._cancelAll()
        }
        throw err
      })
  }

  _getNext (idx) {
    return Array.isArray(this._tasks) ? this._tasks[idx] :
      this._tasks.next().value
  }

  _onComplete (idx) {
    if (this._progress[idx].total < 0) {
      this._progress[idx].total = 0
    }
    this._progress[idx].completed = this._progress[idx].total
    this._reportProgress()
  }

  _setProgress (idx, completed, total) {
    this._progress[idx].completed = completed
    this._progress[idx].total = total
    this._reportProgress()
  }

  _reportProgress () {
    const total = this._options.ignoreWeights ?
      this._computedAdaptiveProgress() :
      this._computeWeightedProgress()
    const pStr = JSON.stringify(this._progress)
    debug(`${this} progress: ${pStr}, weights: ${this._weights}, total: ${total}`)
    this._notify(total, 1)
  }

  _computeWeightedProgress () {
    return this._progress.reduce(
      (sum, {completed, total}, i) => {
        const progress = (total > 0) ? completed / total : 0
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
    return super.toString() + '<' +
      this._tasks.map(task => task.toString()).join(',') +
      '>'
  }
}
