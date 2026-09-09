// Simulation identities. Rendering, voices and naming all resolve the same
// culture; a worker's sex and occupation remain independent of that identity.
export const CULTURES=Object.freeze({
 hearth:Object.freeze({id:'hearth',settingId:'woodland',name:'Hearth',raider:'bone-imp',voices:Object.freeze({male:'v3',female:'female-v1'})}),
 cryos:Object.freeze({id:'cryos',settingId:'cryos',name:'Cryos',raider:'frost-wight',voices:Object.freeze({male:'cryos-male-v1',female:'cryos-female-v1'})}),
 solis:Object.freeze({id:'solis',settingId:'solis',name:'Solis',raider:'husk',voices:Object.freeze({male:'solis-male-v1',female:'solis-female-v1'})})
});
export const CRYOS_NAMES=Object.freeze(['Eira','Nivi','Kori','Aven','Ivo','Ylva','Siv','Nilo','Tova','Rime','Veya','Soren','Lumi','Fenn','Orrin','Nessa','Kael','Anja','Miri','Ulla','Isen','Vala','Runa','Evin','Noor','Skye','Tavi','Neri','Wren','Elva','Fara','Ari','Yori','Sula','Bryn','Ilya','Tala','Venn','Orla','Kira']);
export const isCulture=id=>Object.hasOwn(CULTURES,id);
export const beastLabel=culture=>culture==='cryos'?'Cryos frostbeast':culture==='solis'?'Solis sunbeast':'Hearth mossbeast';
export const raiderFamily=culture=>culture==='cryos'?'cryos-wight':culture==='solis'?'solis-husk':'bone-imp';
export function resolveCulture(id='hearth'){
 if(!Object.hasOwn(CULTURES,id))throw Error('This village culture is unavailable.');
 return CULTURES[id];
}
export function cultureForSetting(settingId){
 const culture=Object.values(CULTURES).find(c=>c.settingId===settingId);
 if(!culture)throw Error('This village setting is unavailable.');
 return culture;
}
export function voiceForWorker(worker){return resolveCulture(worker.culture).voices[worker.sex==='female'?'female':'male'];}

// Names belong to the tribe, not a gender or profession. These invented names
// share the short sha/ta/ru/eh sounds used in Solis's voice direction.
export const SOLIS_NAMES=Object.freeze([
 'Taru','Shara','Ruen','Tavi','Esha','Raku','Suri','Teva','Shen','Arun',
 'Rusha','Tera','Shai','Eru','Vasha','Taren','Shura','Ravi','Eren','Saru',
 'Tesha','Rumi','Shaen','Aru','Vera','Turi','Reva','Shani','Etar','Sava',
 'Tash','Runa','Eshi','Varen','Senu','Tari','Ruel','Ashu','Vesh','Erra',
 'Shavi','Turen','Resha','Asha','Sera','Vuri','Teni','Rashen','Evar','Sharu',
 'Reta','Tuvan','Shevi','Ena','Runi','Aven','Shet','Vanu','Taruvi','Rasen'
]);

export function actorLabel(actor,kind){return actor?.name??(kind==='slime'||actor?.species==='slime'?'Ink slime':actor?.kind==='frost-wight'?'Frost wight':actor?.kind==='husk'?'Husk':kind==='raider'||actor?.kind==='bone-imp'?'Bone imp':kind==='building'?'Building':'Villager');}
