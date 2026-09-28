// A pose tool owns only the joints/properties it addresses. In particular an
// upper-layer arm correction must not erase locomotion on the body below it.
export function toolOwns(clip,node,channel){
 if(clip.tools?.follow?.some(f=>f.joint===node)&&channel==='rotation')return true;
 if(clip.tools?.constraints?.some(c=>[c.joint,c.chain?.root,c.chain?.mid].includes(node)))return true;
 if(Object.values(clip.ik??{}).some(c=>[c.root,c.mid].includes(node))&&channel==='rotation')return true;
 return clip.tools?.layers?.some(l=>l.enabled!==false&&(l.sourceClip?l.joints?.includes(node):Object.hasOwn(l.values?.[node]??{},channel)))??false;
}
