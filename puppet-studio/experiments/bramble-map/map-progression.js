// Clearing a level opens the next stop. Arrival and selection do not.
export function canTravelTo(locations,cleared,id){
 const index=locations.findIndex(n=>n.id===id);
 return index>=0&&(index===0||cleared.has(id)||cleared.has(locations[index-1].id));
}
export function nextLockedLocation(locations,cleared){
 return locations.find(n=>!canTravelTo(locations,cleared,n.id))?.id??null;
}
