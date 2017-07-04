/**
 * Created by yrst on 7/4/2017.
 */
var gulp = require('gulp');
var zip = require('gulp-zip');
var debug = require('gulp-debug');
var clean = require('gulp-clean');
var replace = require("gulp-string-replace");
var fs = require('fs');

var manifest = JSON.parse(fs.readFileSync('src/manifest.json'));

gulp.task('zip', function () {
    return gulp.src("src/**/*")
        .pipe(zip("deploy/extmanager.zip"))
        .pipe(gulp.dest("./"))
        .pipe(debug({title: "zip done"}));
});

gulp.task("increaseVersion", function () {
    manifest.version = (+manifest.version + 0.1).toFixed(1);
    var json = JSON.stringify(manifest);
    fs.writeFile("src/manifest.json", json, "utf8");
});


gulp.task("build", ["increaseVersion", "zip"]);