import copy from 'rollup-plugin-copy-glob';
import livereload from 'rollup-plugin-livereload';

const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'source/popup.js',
	output: {
		sourcemap: !production,
		format: 'iife',
		dir: 'distribution'
	},
	plugins: [
		copy([
			{
				files: 'source/**/!(*.js)',
				dest: 'distribution'
			},
			{
				files: 'node_modules/jquery/dist/jquery.slim.min.js',
				dest: 'distribution'
			}
		], {
			watch: process.env.ROLLUP_WATCH
		}),

		!production && livereload('distribution')
	]
};
