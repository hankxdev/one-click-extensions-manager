import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import livereload from 'rollup-plugin-livereload';
import copy from 'rollup-plugin-copy';

const production = !process.env.ROLLUP_WATCH;

export default {
	input: 'source/main.js',
	output: {
		sourcemap: !production,
		format: 'iife',
		dir: 'distribution'
	},
	plugins: [
		svelte({
			// Enable run-time checks when not in production
			dev: !production,
		}),

		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		commonjs(),
		copy({
			targets: [
				{
					src: ['source/*', '!source/*.js', '!source/*.svelte'],
					dest: 'distribution'
				},
				{
					src: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
					dest: 'distribution'
				}
			]
		}),

		// Watch the `distribution` directory and refresh the
		// browser on changes when not in production
		!production && livereload('distribution')

	],
	watch: {
		clearScreen: false
	}
};
