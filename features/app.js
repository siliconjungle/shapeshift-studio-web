import {mountCatalogue} from '../puppet-studio/catalog/view.js';
const id=decodeURIComponent(location.hash.slice(1));
const catalogue=mountCatalogue(document.querySelector('main'),{siteRoot:new URL('../',location.href),initial:id,onSelect:id=>history.replaceState(null,'','#'+encodeURIComponent(id))});

window.addEventListener('hashchange',()=>catalogue.select(decodeURIComponent(location.hash.slice(1))));
