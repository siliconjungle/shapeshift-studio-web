import {materialDefaults,littleGodsMaterialStyle} from '../scene3d/schema.js';

// Keep the live field and baked frames on the same SVG style as the spider.
export function shapeMaterial(id,color,name='Merged shape'){
 const base={...materialDefaults(id),name,palette:[color,color,'#e9f7ee','#161c17'],relief:0};
 return {...base,...littleGodsMaterialStyle(base)};
}
