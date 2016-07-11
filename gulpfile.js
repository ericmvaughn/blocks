var gulp = require('gulp');
var jshint = require('gulp-jshint');
var jscs = require('gulp-jscs');

// Lint Task
gulp.task('lint', function() {
  return gulp.src(['*.js','public/js/*.js'])
  .pipe(jshint())
  .pipe(jshint.reporter('default'));
});

// jscs task
gulp.task('jscs', function() {
  return gulp.src(['*.js','public/js/*.js'])
  .pipe(jscs())
  .pipe(jscs.reporter());
});

// Watch Files For Changes
gulp.task('watch', function() {
  gulp.watch(['*.js','public/js/*.js'], ['lint', 'jscs']);
});

// Default Task
gulp.task('default', ['lint', 'jscs', 'watch']);
