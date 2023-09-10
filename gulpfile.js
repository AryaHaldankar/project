const gulp = require('gulp');
const rev = require('gulp-rev2');

// Define a task to append content-based hashes to static files
gulp.task('cache-bust', () => {
  return gulp.src(['src/**/*.{css,js}'])
    .pipe(rev())
    .pipe(gulp.dest('dist')) // Output hashed files to a 'dist' folder
    .pipe(rev.manifest())
    .pipe(gulp.dest('views')); // Output a manifest file with the mapping of original filenames to hashed filenames
});

// Default task to run the cache-busting process
gulp.task('default', gulp.series('cache-bust'));