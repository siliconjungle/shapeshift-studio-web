import {WORLD_BOUNDS,previousWorldBounds} from './village-layout.js';
export function gridFor(cell,bounds=WORLD_BOUNDS){return {x:bounds.left,z:bounds.back,width:Math.round((bounds.right-bounds.left)/cell),height:Math.round((bounds.front-bounds.back)/cell),cell};}
export function migrateGrid(state,fields,grid){
 const length=state[fields[0]].length;
 const old=state.grid??(length===grid.width*grid.height?grid:length===Math.round(49.5/grid.cell)*Math.round(37.5/grid.cell)?{x:-15.75,z:-9.75,width:Math.round(49.5/grid.cell),height:Math.round(37.5/grid.cell),cell:grid.cell}:gridFor(grid.cell,previousWorldBounds()));
 if(old.x!==grid.x||old.z!==grid.z||old.width!==grid.width||old.height!==grid.height){
  const dx=Math.round((old.x-grid.x)/grid.cell),dz=Math.round((old.z-grid.z)/grid.cell);
  for(const field of fields){const source=state[field],next=Array(grid.width*grid.height).fill(0);for(let z=0;z<old.height;z++)for(let x=0;x<old.width;x++)if(x+dx>=0&&x+dx<grid.width&&z+dz>=0&&z+dz<grid.height)next[(z+dz)*grid.width+x+dx]=source[z*old.width+x];state[field]=next;}
  state.revision++;if('nextAt' in state)state.nextAt=0;
 }
 state.grid={...grid};return state;
}
export function validGrid(grid,cell,length){return grid===undefined||grid&&grid.cell===cell&&Number.isFinite(grid.x)&&Number.isFinite(grid.z)&&Number.isInteger(grid.width)&&grid.width>0&&Number.isInteger(grid.height)&&grid.height>0&&grid.width*grid.height===length;}
