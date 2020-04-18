import copy from 'rollup-plugin-copy-glob';
import svelte from 'rollup-plugin-svelte';
import resolve from '@rollup/plugin-node-resolve';
import livereload from 'rollup-plugin-livereload';

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
			dev: !production
		}),
		resolve({
			browser: true,
			dedupe: ['svelte']
		}),
		copy([
			{
				files: 'source/**/!(*.js|*.svelte)',
				dest: 'distribution'
			},
			{
				files: 'node_modules/webextension-polyfill/dist/browser-polyfill.min.js',
				dest: 'distribution'
			}
		], {
			watch: process.env.ROLLUP_WATCH
		}),

		!production && livereload('distribution')
	]
};
