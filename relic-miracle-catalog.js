// One shared set of mechanics across all cultures; relic art carries the culture.
const card=(relic,name,colour,hint)=>({relic,name,colour,hint});
export const RELIC_MIRACLES={
 'relic-banquet':card('hungry-idol','Great Feast','#e6ae50','Fill the bellies of everyone within four paces, including beasts.'),
 'relic-ripen':card('hungry-idol','Ripen','#92ac57','Ripen planted, unburnt crops within four paces.'),
 'relic-famine':card('hungry-idol','Famine','#a87aaa','Leave a character ravenously hungry and drain thirty energy.'),
 'relic-concord':card('whispering-mask','Concord','#e0bd73','Ease hostility between nearby villagers and restore their social needs.'),
 'relic-absolution':card('whispering-mask','Absolution','#85cfc5','Lift curses from everyone within four paces.'),
 'relic-nightmare':card('whispering-mask','Nightmare','#a58bd0','Curse a character and drain forty energy, inviting unsettling dreams.'),
 'relic-winter-ward':card('winter-lantern','Winter Ward','#8dc5e0','Shield everyone within four paces for fifteen seconds.'),
 'relic-frostbite':card('winter-lantern','Frostbite','#78b9d8','Strike everyone within four paces for twenty damage. Friends can be caught too.'),
 'relic-renewal':card('winter-lantern','Renewal','#a2d7c9','Restore thirty health and put out burning characters within four paces.')
};
for(const [id,c] of Object.entries(RELIC_MIRACLES))c.art='assets/vector/wishes/cards/'+id+'.svg';
export const relicChoices=kind=>Object.keys(RELIC_MIRACLES).filter(id=>RELIC_MIRACLES[id].relic===kind);
