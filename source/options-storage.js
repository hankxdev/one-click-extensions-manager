import OptionsSync from 'webext-options-sync';

const optionsStorage = new OptionsSync({
	defaults: {
		showButtons: 'on-demand', // Or 'always'
		width: '',
	},
});

export default optionsStorage;
