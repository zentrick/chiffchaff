import gulp from 'gulp'
import loadPlugins from 'gulp-load-plugins'
import {Instrumenter} from 'isparta'
import del from 'del'
import seq from 'run-sequence'
import yargs from 'yargs'
import path from 'path'

const {CI, CIRCLECI, CIRCLE_TEST_REPORTS} = process.env
const PROJECT_ROOT = path.resolve(__dirname, '..')
const PLUGINS = loadPlugins({config: path.join(PROJECT_ROOT, 'package.json')})
const ARGV = yargs
  .string('grep')
  .boolean('bail')
  .argv

export default (options = {}) => {
  const pkgRoot = process.cwd()
  const pkg = require(path.join(pkgRoot, 'package.json'))

  const unitTest = () => {
    const id = path.basename(pkg.name) + '_' + process.version
    const sources = [
      path.join(PROJECT_ROOT, 'test/lib/setup.js'),
      path.join(pkgRoot, 'test/lib/setup.js'),
      path.join(pkgRoot, 'test/{unit,integration}/**/*.js')
    ]
    return gulp.src(sources, {read: false})
      .pipe(PLUGINS.mocha({
        reporter: CIRCLECI ? 'mocha-junit-reporter' : 'spec',
        reporterOptions: CIRCLECI ? {
          mochaFile: path.join(CIRCLE_TEST_REPORTS, `junit/${id}.xml`)
        } : {},
        grep: ARGV.grep,
        bail: ARGV.bail
      }))
  }

  gulp.task('clean:js', () => del(path.join(pkgRoot, 'lib')))

  gulp.task('build:js', ['clean:js'], () => {
    return gulp.src(path.join(pkgRoot, 'src/**/*.js'))
      .pipe(PLUGINS.sourcemaps.init())
      .pipe(PLUGINS.babel())
      .pipe(PLUGINS.sourcemaps.write())
      .pipe(gulp.dest(path.join(pkgRoot, 'lib')))
  })

  gulp.task('lint:js', () => {
    return gulp.src(path.join(pkgRoot, '{src,test}/**/*.js'))
      .pipe(PLUGINS.standard())
      .pipe(PLUGINS.standard.reporter('default', {
        breakOnError: !!CI
      }))
  })

  gulp.task('test:js:unit', unitTest)

  gulp.task('cover:js:instrument', () => {
    return gulp.src(path.join(pkgRoot, 'src/**/*.js'))
      .pipe(PLUGINS.istanbul({
        instrumenter: Instrumenter
      }))
      .pipe(PLUGINS.istanbul.hookRequire())
  })

  gulp.task('cover:js', ['cover:js:instrument'], () => {
    return unitTest()
      .pipe(PLUGINS.istanbul.writeReports())
      .pipe(PLUGINS.if(pkg.coverage != null, PLUGINS.istanbul.enforceThresholds({
        thresholds: pkg.coverage
      })))
  })

  gulp.task('test:js', (cb) => seq('lint:js', 'cover:js', cb))

  gulp.task('watch:js', () => {
    gulp.watch(path.join(pkgRoot, 'src/**/*'), ['build:js'])
  })

  gulp.task('clean', ['clean:js'])

  gulp.task('build', ['build:js'])

  gulp.task('cover', ['cover:js'])

  gulp.task('lint', ['lint:js'])

  gulp.task('test', ['test:js'])

  gulp.task('watch', ['watch:js'])

  gulp.task('default', ['build'], () => gulp.start('watch'))

  return gulp
}
