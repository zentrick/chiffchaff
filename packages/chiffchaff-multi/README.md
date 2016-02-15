# chiffchaff-multi

[![npm](https://img.shields.io/npm/v/chiffchaff-multi.svg)](https://www.npmjs.com/package/chiffchaff-multi) [![Dependencies](https://img.shields.io/david/zentrick/chiffchaff-multi.svg)](https://david-dm.org/zentrick/chiffchaff-multi) [![Build Status](https://img.shields.io/travis/zentrick/chiffchaff-multi.svg)](https://travis-ci.org/zentrick/chiffchaff-multi) [![Coverage Status](https://img.shields.io/coveralls/zentrick/chiffchaff-multi.svg)](https://coveralls.io/r/zentrick/chiffchaff-multi) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

Multi-task execution for [chiffchaff](https://github.com/zentrick/chiffchaff).

## Example

_**Note:** Like chiffchaff itself, this example is written in ES2015. Please
[familiarize yourself with ES2015](https://babeljs.io/docs/learn-es2015/) before
tackling it._

Let's download a couple of files in parallel. Assuming we already have a
[`DownloadTask` class](https://github.com/zentrick/chiffchaff#example), let's
create a few of those:

```js
const urls = [
  'http://media.w3.org/2010/05/sintel/trailer.mp4',
  'http://media.w3.org/2010/05/bunny/trailer.mp4',
  'http://media.w3.org/2010/05/bunny/movie.mp4',
  'http://media.w3.org/2010/05/video/movie_300.webm'
]
const downloadTasks = urls.map((url) => new DownloadTask(url))
```

Now, we could `start()` those tasks individually, but that's not what we're
after. Using `MultiTask`, we can create a task that downloads all four files,
with varying settings.

By default, `MultiTask` will execute the provided tasks one by one. Thus, the
following task will download the files sequentially:

```js
const sequentialDownloadTask = new MultiTask(downloadTasks)
```

The `concurrency` option lets us run multiple tasks in parallel. If we pass
`Infinity`, all the tasks will run simultaneously. Let's limit the number of
simultaneous downloads to two though:

```js
const twoInParallelDownloadTask = new MultiTask(downloadTasks, {
  concurrency: 2
})
```

One of chiffchaff's core features is cancellation. Because all the tasks we're
providing are of the type `DownloadTask` and therefore cancellable, we can also
cancel the `MultiTask`, which will automatically cancel all the downloads.
To enable this behavior, we enable the `cancel` option:

```js
const cancellableTwoInParallelDownloadTask = new MultiTask(downloadTasks, {
  concurrency: 2,
  cancel: true
})
```

There are a few other options, but let's actually download some files first.
Like any other chiffchaff `Task`, a `MultiTask` is started using the `start()`
function. The return value is a promise that will be resolved when all the
subtasks have been completed.

```js
cancellableTwoInParallelDownloadTask.start()
  .then((result) => console.info('All downloads completed'))
  .catch((err) => console.error('Error: %s', err))
```

Another one of chiffchaff's strengths is its built-in progress reporting.
`MultiTask` is no different. Just like with an individual `DownloadTask`, we can
subscribe to updates from the compound download task by listening for the
`progress` event.

```js
cancellableTwoInParallelDownloadTask.on('progress',
  (compl, total) => console.info('Progress: %d/%d', compl, total))
```

But how is the progress calculated? By default, all tasks will be treated
equally. For example, if three out of four files have finished downloading and
the fourth one hasn't started, progress will be at 75%. There are two options
that affect the calculation.

The first option is `weights`. We can optionally supply an array of numbers that
correspond to the weights of the supplied tasks. In our example, if we wanted
to make the first task contribute twice the weight of the other three, we
would pass `weights` of `[2, 1, 1, 1]`.

For downloads, however, it makes more sense to just add up the byte sizes.
`MultiTask` lets us do that as well. If we pass the `ignoreWeights` option,
the tasks' weights will be determined by their total sizes as passed when
reporting progress. In the case of `DownloadTask`, the total size is the size of
the file that is being downloaded, which is exactly what we need. Hence, we can
get more accurate progress reporting by initializing our `MultiTask` as follows
instead:

```js
const accurateDownloadTask = new MultiTask(downloadTasks, {
  concurrency: 2,
  cancel: true,
  ignoreWeights: true
})
```

This concludes our brief tour of `MultiTask`. We've only just scratched the
surface though. Full API documentation is on its way!

## Maintainer

[Tim De Pauw](https://github.com/timdp)

## License

MIT
