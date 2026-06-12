import svelte from 'rollup-plugin-svelte';
import {defineConfig} from 'tsdown';
import pkg from './package.json' with {type: "json"};

export default defineConfig({
	entry: {
		main: 'source/main.js',
		'options/options': 'source/options/options.js',
		background: 'source/background.js',
	},
	deps: {onlyBundle: Object.keys(pkg.dependencies)},
	outDir: 'distribution',
	format: 'es',
	clean: true,
	platform: 'browser',
	copy: [
		{from: 'source/**/*.!(test.js|js|svelte)', to: 'distribution', flatten: false},
	],
	plugins: [svelte()],
});
