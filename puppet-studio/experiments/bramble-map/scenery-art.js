// Root footprints measured against the authored cutouts, in fractions of width.
// The Hearth sapling image contains two trunks, so it leaves two aligned stumps.
export const stumpLayout={
 pine:[{art:'map-stump-pine-large',width:.40,x:-.26},{art:'map-stump-pine-small',width:.25,x:.21}],
 oak:[{art:'map-stump-hearth',width:.70,x:0}],
 'solis-tree':[{art:'map-stump-solis',width:.52,x:0}],
 'cryos-pine':[{art:'map-stump-cryos',width:.73,x:0}]
};
export const sceneryEffectAssets=[...new Set(Object.values(stumpLayout).flat().map(p=>p.art)),...['hearth','solis','cryos'].map(r=>'map-leaf-'+r),...['wood','stone'].map(r=>'map-resource-'+r)];
