import process from 'node:process';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import copy from 'rollup-plugin-copy-glob';
import livereload from 'rollup-plugin-livereload';
import svelte from 'rollup-plugin-svelte';

const production = !process.env.ROLLUP_WATCH;

const config = {
	input: {
		main: 'source/main.js',
		'options/options': 'source/options/options.js',
		background: 'source/background.js',
	},
	output: {
		sourcemap: !production,
		format: 'es',
		dir: 'distribution',
	},
	plugins: [
		svelte({
			compilerOptions: {
				// Enable run-time checks when not in production
				dev: !production,
			},
		}),
		commonjs(),
		resolve({
			browser: true,
			dedupe: ['svelte'],
		}),
		copy(
			[
				{
					files: 'source/**/!(*.js|*.svelte)',
					dest: 'distribution',
				},
			],
			{
				watch: process.env.ROLLUP_WATCH,
			},
		),

		!production && livereload('distribution'),
	],
};

export default config;
