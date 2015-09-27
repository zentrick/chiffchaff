var Task = require('../../chiffchaff')
var MultiTask = require('../../chiffchaff-multi')
var WwwReporter = require('../')

function DownloadTask (progress) {
  Task.call(this)
  this._progress = progress
}
DownloadTask.prototype = new Task()
DownloadTask.prototype.constructor = DownloadTask

DownloadTask.prototype._start = function () {
  var that = this
  return new Promise(function () {
    setTimeout(function () {
      that._notify(that._progress, 1)
    }, 0)
  })
}

var reporter = new WwwReporter()
Task.reporter = reporter

var tasks = [0.543, 0.137, 0.781].map(function (progress) {
  return new DownloadTask(progress)
})
var multiTask = new MultiTask(tasks, {
  concurrency: Infinity,
  ignoreWeights: true
})

reporter.start()
  .then(function () {
    multiTask.start()
  })
