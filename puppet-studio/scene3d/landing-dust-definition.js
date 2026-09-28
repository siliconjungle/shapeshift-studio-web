// Generated artwork is partitioned and animated as vector geometry. All timing,
// shape, palette and layer rules are authored data, consumed by the generic kit.
const v=name=>['var',name],op=(name,...args)=>[name,...args];
const add=(...a)=>op('add',...a),sub=(a,b)=>op('sub',a,b),mul=(...a)=>op('mul',...a),div=(a,b)=>op('div',a,b),pow=(a,b)=>op('pow',a,b),clamp=a=>op('clamp',a,0,1),ease=a=>op('smooth',a),eq=(a,b)=>op('eq',a,b);
const p=v('p'),travel=v('travel'),age=v('age'),life=v('life'),scale=v('scale');
const base={curveSegments:28,boundsTolerance:4,surfaceOffset:.006,renderOrder:20,color:'#f0bf4b'};
export const landingDustDefinition={...base,projection:'ground',buckets:[{when:v('large'),id:'shock'},{when:op('gt',v('area'),mul(v('width'),v('height'),.004)),id:'puff-',sector:true},{when:true,id:'chips'}],animation:{
 variables:[['p',clamp(div(age,.75))],['travel',sub(1,pow(sub(1,p),3))],['size',mul(add(1.15,mul(travel,1.6)),op('sqrt',op('max',.9,v('strength'))))]],
 visible:op('and',op('gte',age,0),op('lt',age,.75)),
 root:{'scale.x':v('size'),'scale.y':v('size'),'scale.z':v('size')},
 layers:[
  {variables:[['alpha',sub(1,ease(div(sub(p,.12),.88)))]],tracks:{}},
  {when:op('startsWith',v('id'),'puff'),variables:[['delay',mul(op('mod',v('sector'),3),.025)],['life',clamp(div(sub(age,v('delay')),.65))],['pop',op('sin',mul(Math.PI,clamp(mul(life,2.2))))],['scale',mul(add(.55,mul(v('pop'),.6)),sub(1,mul(life,.45)))],['alpha',mul(sub(1,ease(div(sub(life,.2),.8))),.9)]],tracks:{
   'position.x':mul(v('center.x'),add(1,mul(life,.15))), 'position.y':mul(v('center.y'),add(1,mul(life,.15))),'position.z':0,
   'scale.x':mul(scale,add(1,mul(life,.25))),'scale.y':mul(scale,sub(1,mul(life,.2))),
   'rotation.z':mul(op('if',op('mod',v('sector'),2),1,-1),life,.35)}},
  {when:op('not',op('startsWith',v('id'),'puff')),variables:[['scale',op('if',eq(v('id'),'shock'),add(.78,mul(travel,.34)),1)]],tracks:{'scale.x':scale,'scale.y':scale,'scale.z':scale}},
  {when:eq(v('id'),'streaks'),variables:[['alpha',mul(v('alpha'),sub(1,ease(div(p,.5))))]]},
  {when:eq(v('id'),'chips'),variables:[['alpha',mul(v('alpha'),sub(1,p))]],tracks:{'rotation.z':mul(p,.22)}},
  {tracks:{alpha:v('alpha'),time:age,flutter:mul(.045,sub(1,p))}}
 ]
}};
