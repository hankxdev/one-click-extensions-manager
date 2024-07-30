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
		'style/semi': ['error', 'always'],
		'no-bitwise': 'off',
		'no-inner-declarations': 'off',
		'no-new': 'off',
		'no-self-assign': 'off',
		'unicorn/prefer-top-level-await': 'off',
		'no-console': 'off',
		'antfu/if-newline': 'off',
		'import/order': 'off',
		'style/arrow-parens': 'off',
		'style/brace-style': 'off',
		'jsonc/object-curly-spacing': 'off',
		'style/member-delimiter-style': 'off',
		'style/object-curly-spacing': 'off',
	},
});
