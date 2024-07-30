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
		'no-bitwise': 'off',
		'no-inner-declarations': 'off',
		'no-new': 'off',
		'no-self-assign': 'off',
		'unicorn/prefer-top-level-await': 'off',
		eqeqeq: 'off',
		'no-alert': 'off',
		'no-console': 'off',
		'antfu/if-newline': 'off',
		'import/order': 'off',
		'style/arrow-parens': 'off',
		'style/brace-style': 'off',
		'jsonc/object-curly-spacing': 'off',
		'style/indent-binary-ops': 'off',
		'style/indent': 'off',
		'style/jsx-one-expression-per-line': 'off',
		'style/member-delimiter-style': 'off',
		'style/object-curly-spacing': 'off',
		'style/multiline-ternary': 'off',
		'style/operator-linebreak': 'off',
		'style/quote-props': 'off',
		'style/quotes': 'off',
		'style/semi': 'off',
		'style/type-generic-spacing': 'off',
	},
});
