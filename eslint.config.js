import antfu from '@antfu/eslint-config';

export default antfu({
	svelte: true,
	stylistic: {
		indent: 'tab',
	},

	languageOptions: {
		globals: {
			chrome: true,
		},
	},
	rules: {
		'no-self-assign': 'off',
		'no-console': 'off',
		'import/order': 'off',
		'jsonc/object-curly-spacing': 'off',
		'style/semi': ['error', 'always'],
		'svelte/html-quotes': [
			'error',
			{
				prefer: 'double',
			},
		],
		'style/arrow-parens': 'off',
		'style/object-curly-spacing': 'off',

		// Prettier conflicts
		'style/brace-style': 'off',
		'style/indent': 'off',
		'style/operator-linebreak': 'off',
		'style/quote-props': 'off',
		'svelte/indent': 'off',
	},
});
