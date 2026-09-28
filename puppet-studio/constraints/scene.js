import {solveConstraints3D} from '@shapeshift-labs/studio-core/constraints/solve3d';
import {applySceneResolved} from '../scene3d/resolved-channels.js';
// Work from the final displayed pose (including controllers / state-machine
// blends), then use the existing resolved-channel path to update geometry rigs.
export function applySceneConstraints(host){const constraints=host.project?.scene3d.constraints;if(!constraints?.length)return;
 const nodes=host.project.scene3d.nodes.map(n=>{const o=host.objects.get(n.id);return{...n,position:o.position.toArray(),rotation:[o.rotation.x,o.rotation.y,o.rotation.z].map(v=>v*180/Math.PI),scale:o.scale.toArray()};}),clip=host.project.scene3d.clips.find(c=>c.id===host.clipId),solved=solveConstraints3D(nodes,constraints,clip,host.time);
 const previous=host.channelOverrides;try{host.channelOverrides=[...(previous??[]),...[...solved].flatMap(([node,t])=>['position','rotation','scale'].map(channel=>({node,channel,value:t[channel]})))];applySceneResolved(host);}finally{host.channelOverrides=previous;}
}
