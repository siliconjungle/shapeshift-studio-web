export * from '@shapeshift-labs/studio-core/scene3d/regular-solid';
import {regularSolid} from '@shapeshift-labs/studio-core/scene3d/regular-solid';
// For convex solids, mean projected area over all orientations is surface area / 4.
// Match that to the D6 so angular dice have equal visual weight while tumbling.
export function solidSurfaceArea(solid){let area=0;for(const face of solid.faces){const a=solid.vertices[face.ids[0]];for(let i=1;i<face.ids.length-1;i++){const b=solid.vertices[face.ids[i]].map((v,k)=>v-a[k]),c=solid.vertices[face.ids[i+1]].map((v,k)=>v-a[k]);area+=Math.hypot(b[1]*c[2]-b[2]*c[1],b[2]*c[0]-b[0]*c[2],b[0]*c[1]-b[1]*c[0])/2;}}return area;}
const referenceArea=solidSurfaceArea(regularSolid({sides:6}));
export function normalizeDiceSize(solid){const scale=Math.sqrt(referenceArea/solidSurfaceArea(solid)),scaled=structuredClone(solid),point=p=>p.map(v=>v*scale);scaled.vertices=scaled.vertices.map(point);scaled.mesh.positions=scaled.mesh.positions.map(v=>v*scale);for(const face of scaled.faces){face.center=point(face.center);face.inset=face.inset.map(point);}return scaled;}
