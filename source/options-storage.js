import OptionsSync from 'webext-options-sync';

const optionsStorage = new OptionsSync({
	storageType: 'local', // `openingStyle` cannot be synchronized
	defaults: {
		showButtons: 'on-demand', // Or 'always'
		width: '',
		openingStyle: 'popup',
	},
});

export default optionsStorage;
