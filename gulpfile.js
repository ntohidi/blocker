'use strict'

const gulp = require('gulp')
const browserSync = require('browser-sync').create()
const notify = require('gulp-notify')
const less = require('gulp-less')
const sourcemaps = require('gulp-sourcemaps')
const babel = require('gulp-babel')
const uglify = require('gulp-uglify')
const cssmin = require('gulp-cssmin')
const imagemin = require('gulp-imagemin')
const clean = require('gulp-clean')
const autoprefixer = require('gulp-autoprefixer')
const browserify = require('browserify')
const watchify = require('watchify')
const gulpUtil = require('gulp-util')
const vinylBuffer = require('vinyl-buffer')
const vinylSourceStream = require('vinyl-source-stream')
const lodashAssign = require('lodash.assign')
const config = require('./common/config')
const serverConfig = require('./server/config')

const serverPort = config.serverPort
const isProd = config.isProd
const brwoserSyncPort = serverConfig.brwoserSyncPort
const browserSyncUrl = 'http://localhost:' + serverPort
const browserSyncOpt = {
  port: brwoserSyncPort,
  proxy: browserSyncUrl
}

/* ================================================================ Helper
 */

function handleError (err) {
  gulpUtil.log(err)
  const args = Array.prototype.slice.call(arguments)
  notify.onError({
    title: 'Compile Error',
    message: '<%= error.message %>'
  }).apply(this, args)
  if (typeof this.emit === 'function') this.emit('end')
}

/* ================================================================ Js task
 */

// For build: use plain browserify (not watchify)
function bundleJs () {
  const b = browserify({
    entries: ['./public/src/js/main.js'],
    debug: !isProd
  }).transform('babelify', {
    presets: ['@babel/preset-env'],
    sourceMaps: !isProd
  })

  let stream = b.bundle()
    .on('error', gulpUtil.log.bind(gulpUtil, 'Browserify Error'))
    .pipe(vinylSourceStream('bundle.js'))
    .pipe(vinylBuffer())

  if (isProd) {
    stream = stream
      .pipe(uglify()).on('error', handleError)
  } else {
    stream = stream
      .pipe(sourcemaps.init({ loadMaps: true }))
      .pipe(sourcemaps.write('./'))
  }

  return stream
    .pipe(gulp.dest('./public/dist/js'))
    .pipe(browserSync.stream({ once: true }))
}

gulp.task('js', bundleJs)

// For watch: use watchify for fast rebuilds
function watchJs () {
  const b = watchify(browserify({
    entries: ['./public/src/js/main.js'],
    debug: !isProd,
    cache: {},
    packageCache: {}
  }).transform('babelify', {
    presets: ['@babel/preset-env'],
    sourceMaps: !isProd
  }))

  function rebundle () {
    let stream = b.bundle()
      .on('error', gulpUtil.log.bind(gulpUtil, 'Browserify Error'))
      .pipe(vinylSourceStream('bundle.js'))
      .pipe(vinylBuffer())

    if (isProd) {
      stream = stream
        .pipe(uglify()).on('error', handleError)
    } else {
      stream = stream
        .pipe(sourcemaps.init({ loadMaps: true }))
        .pipe(sourcemaps.write('./'))
    }

    return stream
      .pipe(gulp.dest('./public/dist/js'))
      .pipe(browserSync.stream({ once: true }))
  }

  b.on('update', rebundle)
  b.on('log', gulpUtil.log)

  return rebundle()
}

/* ================================================================ Other tasks
 */

gulp.task('clean', function () {
  var cleanOpt = { read: false }
  return gulp.src('./public/dist/*', cleanOpt)
    .pipe(clean())
})

gulp.task('less', function () {
  if (isProd) {
    return gulp.src('./public/src/less/main.less')
      .pipe(less())
      .pipe(autoprefixer('last 2 versions', '> 1%', 'ie 8'))
      .pipe(cssmin())
      .pipe(gulp.dest('./public/dist/css'))
      .pipe(browserSync.stream({ once: true }))
  } else {
    return gulp.src('./public/src/less/main.less')
      .pipe(sourcemaps.init())
      .pipe(less())
      .pipe(autoprefixer('last 2 versions', '> 1%', 'ie 8'))
      .pipe(sourcemaps.write('./'))
      .pipe(gulp.dest('./public/dist/css'))
      .pipe(browserSync.stream({ once: true }))
  }
})

gulp.task('image', function () {
  if (isProd) {
    return gulp.src('./public/src/asset/image/**/*')
      .pipe(imagemin())
      .pipe(gulp.dest('./public/dist/asset/image'))
  } else {
    return gulp.src('./public/src/asset/image/**/*')
      .pipe(gulp.dest('./public/dist/asset/image'))
  }
})

gulp.task('sound', function () {
  return gulp.src('./public/src/asset/sound/**/*')
    .pipe(gulp.dest('./public/dist/asset/sound'))
})

gulp.task('serve', function () {
  browserSync.init(browserSyncOpt)

  const watchOpt = { interval: 500 }

  gulp.watch('./public/index.html', watchOpt).on('change', browserSync.reload)
  gulp.watch('./public/src/less/**/*.less', gulp.series('less'))
  gulp.watch('./public/src/asset/image/**/*', gulp.series('image'))
  gulp.watch('./public/src/asset/sound/**/*', gulp.series('sound'))
  // Use watchJs for incremental JS builds
  gulp.watch('./public/src/js/main.js', gulp.series(watchJs))
})

// should run `clean` first
gulp.task('build', gulp.series('clean', 'less', 'js', 'image', 'sound'))
gulp.task('watch', gulp.series('serve'))
gulp.task('default', gulp.series('build'))