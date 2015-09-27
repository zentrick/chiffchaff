# chiffchaff-reporter-www

[![npm](https://img.shields.io/npm/v/chiffchaff-reporter-www.svg)](https://www.npmjs.com/package/chiffchaff-reporter-www) [![Dependencies](https://img.shields.io/david/zentrick/chiffchaff-reporter-www.svg)](https://david-dm.org/zentrick/chiffchaff-reporter-www) [![Build Status](https://img.shields.io/travis/zentrick/chiffchaff-reporter-www.svg)](https://travis-ci.org/zentrick/chiffchaff-reporter-www) [![Coverage Status](https://img.shields.io/coveralls/zentrick/chiffchaff-reporter-www.svg)](https://coveralls.io/r/zentrick/chiffchaff-reporter-www) [![JavaScript Standard Style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg)](https://github.com/feross/standard)

Live HTML-based reporting for chiffchaff.

## Preview

![Preview](https://rawgit.com/zentrick/chiffchaff-reporter-www/master/preview.svg)

## Usage

```js
import Task from 'chiffchaff'
import WwwReporter from 'chiffchaff-reporter-www'

const reporter = new WwwReporter()
Task.reporter = reporter
reporter.start()
  .then(() => {
    // Start some tasks and watch the magic happen.
  })
```

## Maintainer

[Tim De Pauw](https://github.com/timdp)

## License

MIT
