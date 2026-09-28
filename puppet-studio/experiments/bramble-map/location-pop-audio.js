import {soundRecipe} from '../shared/action-sound-recipes.js';

// Six-note pentatonic phrases: one note per landmark, resolving on C.
const melodies=[
 [0,2,4,7,9,12],
 [4,7,9,7,2,0],
 [0,7,4,9,7,12],
 [12,9,7,4,2,0],
 [7,4,2,4,7,12],
];
export function chooseLocationMelody(previous,random=Math.random){
 const choices=melodies.filter(melody=>melody!==previous);
 return choices[Math.floor(random()*choices.length)];
}
export function locationPopSound(index,random=Math.random,melody=melodies[0]){
 const frequency=523.2511306*2**(melody[index%melody.length]/12);
 const recipe=soundRecipe('pot-place');
 // Keep the game's soft placement thump and noise, but tune its ringing layer.
 // Only six cents of tuning variation: the notes still form a melody.
 const pitch=2**(((random()-.5)*12)/1200),articulation=.9+random()*.2;
 return{
  level:.36+random()*.08,
  recipe:{...recipe,pitch:[pitch,pitch],layers:recipe.layers.map((layer,i)=>
   i===1?{type:'tone',args:[frequency,frequency,.25*articulation,.035,'sine']}:
   {...layer,args:[...layer.args]})}
 };
}
