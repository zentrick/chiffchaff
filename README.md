# chiffchaff

[![npm](https://img.shields.io/npm/v/chiffchaff.svg)](https://www.npmjs.com/package/chiffchaff) [![Dependencies](https://img.shields.io/david/zentrick/chiffchaff.svg)](https://david-dm.org/zentrick/chiffchaff) [![Build Status](https://img.shields.io/travis/zentrick/chiffchaff/master.svg)](https://travis-ci.org/zentrick/chiffchaff) [![Coverage Status](https://img.shields.io/coveralls/zentrick/chiffchaff/master.svg)](https://coveralls.io/r/zentrick/chiffchaff) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

Cancellable promises with progress reporting. A more object-oriented approach to
using [bluebird](http://bluebirdjs.com/).

## Example

_**Note:** Like chiffchaff itself, this example is written in ES2015. Please
[familiarize yourself with ES2015](https://babeljs.io/docs/learn-es2015/) before
tackling it._

Let's say we want to create a `DownloadTask` class that we can use to download
a file over HTTP. This would be a typical instantiation of that class:

```js
const url = 'http://media.w3.org/2010/05/sintel/trailer.mp4'
const videoDownloadTask = new DownloadTask(url)
```

By default, a chiffchaff `Task` will emit `start`, `progress`, and `end` events
whenever its status changes. Thus, we can listen for those, for example to log
progress information to the console.

```js
videoDownloadTask
  .on('start', () => console.info('Starting download ...'))
  .on('progress',
    (compl, total) => console.info('Progress: %d/%d bytes', compl, total))
```

A `Task` will not carry out any work until its `start` function is called. That
one returns a
[cancellable promise](http://bluebirdjs.com/docs/api/cancellation.html)
which will be fulfilled with the result of the task. Hence, we start our
download task as follows:

```js
videoDownloadTask.start()
  .then((result) => console.info('Download complete: %d bytes', result.length))
  .catch((err) => console.error('Error: %s', err))
  .finally(() => {
    if (videoDownloadTask.isCancelled()) {
      console.warn('Download cancelled')
    }
  })
```

Let's say that after a second, we change our mind and want to cancel the
download. It's as simple as calling `cancel` on the task.

```js
setTimeout(() => {
  console.info('Cancelling download ...')
  videoDownloadTask.cancel()
}, 1000)
```

Now that we've established the `DownloadTask` API, let's actually implement the
class. As you may already have guessed, it's essentially a wrapper for Node's
[`http.get`](https://nodejs.org/api/http.html#http_http_get_options_callback).

To avoid having to enable bluebird's cancellation feature manually, chiffchaff
exports a preconfigured `Promise` alongside its own `Task`. You can also access
it as `require('chiffchaff').Promise` if you prefer CommonJS.

```js
import {default as Task, Promise} from 'chiffchaff'
import http from 'http'

class DownloadTask extends Task {
  constructor (url) {
    super()
    this._url = url
    this._request = null
    this._downloaded = 0
    this._contentLength = 0
    this._data = []
  }

  // Subclasses of Task must only override the _start function. It returns a
  // cancellable promise for the work which the task is carrying out.
  _start () {
    return new Promise((resolve, reject, onCancel) => {
      // Hold on to the callbacks so we can use them below.
      this._resolve = resolve
      this._reject = reject
      this._request = http.get(this._url, (res) => this._onResponse(res))
        .once('error', (err) => reject(err))
      // If the task gets cancelled, abort the underlying HTTP request.
      onCancel(() => this._request.abort())
    })
  }

  _onResponse (response) {
    if (response.statusCode !== 200) {
      this._reject(new Error(`HTTP ${response.statusCode}`))
    } else {
      this._contentLength = parseInt(response.headers['content-length'], 10)
      // Whenever a task has updated information on its progress, it should call
      // _notify with two numbers: the completed amount and the total amount.
      // In this case, we're passing the number of bytes downloaded and the
      // total size of the file.
      this._notify(this._downloaded, this._contentLength)
      response
        .on('data', (chunk) => this._onData(chunk))
        .once('end', () => this._resolve(Buffer.concat(this._data)))
    }
  }

  _onData (chunk) {
    this._downloaded += chunk.length
    this._data.push(chunk)
    this._notify(this._downloaded, this._contentLength)
  }
}
```

A more robust implementation of `DownloadTask` will eventually be made available
as a Node module.

## Maintainer

[Tim De Pauw](https://github.com/timdp)

## License

MIT
