import process from 'node:process';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import {copy} from '@web/rollup-plugin-copy';
import cleanup from 'rollup-plugin-cleanup';
import del from 'rollup-plugin-delete';
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
		copy({
			rootDir: './source',
			patterns: '**/*',
			exclude: ['**/*.js', '**/*.svelte'],
		}),
		cleanup(),
		del({
			targets: ['distribution'],
			runOnce: true, // `false` would be nice, but it deletes the files too early, causing two extension reloads
		}),
		!production && livereload('distribution'),
	],
};

export default config;
