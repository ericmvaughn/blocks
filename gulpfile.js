var gulp = require('gulp');
var jshint = require('gulp-jshint');

// Lint Task
gulp.task('lint', function() {
    return gulp.src(['*.js','public/js/*.js'])
        .pipe(jshint())
        .pipe(jshint.reporter('default'));
});

// Watch Files For Changes
gulp.task('watch', function() {
    gulp.watch(['*.js','public/js/*.js'], ['lint']);
});

// Default Task
gulp.task('default', ['lint', 'watch']);
