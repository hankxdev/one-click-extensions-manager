import {fileURLToPath} from 'node:url';
import eslintConfigXo from 'eslint-config-xo';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import sveltePlugin from 'eslint-plugin-svelte';
import {defineConfig, globalIgnores, includeIgnoreFile} from 'eslint/config';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig([
	includeIgnoreFile(gitignorePath),
	globalIgnores(['package-lock.json']),
	...eslintConfigXo({browser: true}),
	{
		files: ['**/*.svelte'],
		extends: [sveltePlugin.configs['flat/recommended']],
		rules: {
			'unicorn/prefer-top-level-await': 'off',
			'import-x/no-mutable-exports': 'off',
		},
	},
	{
		languageOptions: {
			globals: {chrome: 'readonly'},
		},
		rules: {
			'no-console': 'off',
			'jsdoc/require-param': 'off',
			'@html-eslint/attrs-newline': 'off',
			'@html-eslint/no-extra-spacing-tags': 'off',
			'@html-eslint/require-closing-tags': 'off',
		},
	},
	eslintConfigPrettier,
]);
