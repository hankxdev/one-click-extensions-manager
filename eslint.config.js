import antfu from '@antfu/eslint-config';

export default antfu({
	stylistic: {
		indent: 'tab',
		quotes: 'single', // or 'double'
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
		'style/arrow-parens': 'off',
		'style/object-curly-spacing': 'off',

		// Prettier conflicts
		'style/brace-style': 'off',
		'style/indent': 'off',
		'style/operator-linebreak': 'off',
		'style/quote-props': 'off',
	},
});
