import {fileURLToPath} from 'node:url';
import eslintConfigXo from 'eslint-config-xo';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import sveltePlugin from 'eslint-plugin-svelte';
import {defineConfig, globalIgnores, includeIgnoreFile} from 'eslint/config';

const gitignorePath = fileURLToPath(new URL('.gitignore', import.meta.url));

export default defineConfig([
	includeIgnoreFile(gitignorePath, {gitignoreResolution: true}),
	globalIgnores(['package-lock.json']),
	...eslintConfigXo({
		browser: true,
	}),
	{
		files: ['**/*.svelte'],
		plugins: {svelte: sveltePlugin},
		extends: [sveltePlugin.configs['flat/recommended']],
		languageOptions: {
			parserOptions: {
				parser: '@typescript-eslint/parser',
			},
		},
		rules: {
			// Incompatible with svelte
			'unicorn/prefer-top-level-await': 'off',
			'import-x/no-mutable-exports': 'off',
		},
	},
	{
		languageOptions: {
			globals: {
				chrome: 'readonly',
			},
		},
		rules: {
			'no-self-assign': 'off',
			'no-console': 'off',
			'jsdoc/require-param': 'off',
			'jsonc/object-curly-spacing': 'off',
			'import/no-mutable-exports': 'off',
			'style/arrow-parens': 'off',
			'style/object-curly-spacing': 'off',

			// Prettier conflicts
			'style/brace-style': 'off',
			'style/indent': 'off',
			'style/operator-linebreak': 'off',
			'style/quote-props': 'off',
		},
	},
	eslintConfigPrettier,
]);
