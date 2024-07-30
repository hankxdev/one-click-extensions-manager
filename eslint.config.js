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
		'no-self-assign': 'off',
		'no-console': 'off',
		'import/order': 'off',
		'jsonc/object-curly-spacing': 'off',
		'style/arrow-parens': 'off',
		'style/object-curly-spacing': 'off',
	},
});
