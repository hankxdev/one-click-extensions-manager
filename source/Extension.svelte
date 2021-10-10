<script>
  import openInTab from './lib/open-in-tab.js';

  export let id;
  export let name;
  export let enabled;
  export let installType;
  export let homepageUrl;
  export let optionsUrl;
  export let icons;
  export let showExtras;
  export let undoStack;
  export let updateUrl;

  const getI18N = chrome.i18n.getMessage;
  const url = generateHomeURL();

  function generateHomeURL() {
  	const chromeWebStorUrl = 'https://chrome.google.com/webstore/detail/';
  	const edgeWebStoreUrl = 'https://microsoftedge.microsoft.com/addons/detail/';
  	// Edge extension's update url starts with https://edge.microsoft.com
  	const isEdge = updateUrl.indexOf('https://edge.microsoft.com') === 0;
  	return installType === 'normal'
  		? (isEdge ? edgeWebStoreUrl : chromeWebStorUrl) + id
  		: homepageUrl;
  }

  function toggleExtension() {
  	const wasEnabled = enabled;

  	undoStack.do(toggle => {
  		enabled = toggle !== wasEnabled;
  		chrome.management.setEnabled(id, enabled);
  	});
  }

  function onUninstallClick() {
  	chrome.management.uninstall(id);
  }

  function getIcon(icons, size = 16) {
  	// Get retina size if necessary
  	size *= window.devicePixelRatio;

  	if (icons) {
  		// Get a large icon closest to the desired size
  		for (const icon of icons.reverse()) {
  			if (icon.size >= size) {
  				return icon.url;
  			}
  		}
  	}

  	// Fallback icon
  	return 'icons/puzzle.svg';
  }
</script>

<li class:disabled={!enabled} class="ext type-{installType}">
  <button
    type="button"
    class="ext-name"
    on:click={toggleExtension}
    on:contextmenu
  >
    <img alt="" src={getIcon(icons, 16)} />{name}
  </button>
  {#if optionsUrl && enabled}
    <a href={optionsUrl} title={getI18N('gotoOpt')} on:click={openInTab}>
      <img src="icons/options.svg" alt="" />
    </a>
  {/if}
  {#if showExtras}
    {#if url}
      <a href={url} title={getI18N('openUrl')} target="_blank">
        <img src="icons/globe.svg" alt="" />
      </a>
    {/if}
    <a
      href="chrome://extensions/?id={id}"
      title={getI18N('manage')}
      on:click={openInTab}
    >
      <img src="icons/ellipsis.svg" alt="" />
    </a>
    <button
      type="button"
      title={getI18N('uninstall')}
      on:click={onUninstallClick}
    >
      <img src="icons/bin.svg" alt="" />
    </button>
  {/if}
</li>
