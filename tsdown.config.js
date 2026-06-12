import svelte from 'rollup-plugin-svelte';
import {defineConfig} from 'tsdown';

export default defineConfig({
	entry: {
		main: 'source/main.js',
		'options/options': 'source/options/options.js',
		background: 'source/background.js',
	},
	outDir: 'distribution',
	format: 'es',
	clean: true,
	platform: 'browser',
	copy: [
		{from: 'source/**/*', to: 'distribution'},
		'!source/**/*.js',
		'!source/**/*.svelte',
	],
	plugins: [svelte()],
});
