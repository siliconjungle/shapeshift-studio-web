// Each card keeps its own generated, palette-mapped SVG. Original artwork is retained.
export function vectorCardArtwork(cards){
 return Object.fromEntries(Object.entries(cards).map(([id,definition])=>[id,{...definition,art:'assets/vector/wishes/cards-v2/'+id+'.svg'}]));
}
