// Generated artwork is partitioned and animated as vector geometry. All timing,
// shape, palette and layer rules are authored data, consumed by the generic kit.
const v=name=>['var',name],op=(name,...args)=>[name,...args];
const add=(...a)=>op('add',...a),sub=(a,b)=>op('sub',a,b),mul=(...a)=>op('mul',...a),div=(a,b)=>op('div',a,b),pow=(a,b)=>op('pow',a,b),clamp=a=>op('clamp',a,0,1),ease=a=>op('smooth',a),eq=(a,b)=>op('eq',a,b);
const p=v('p'),travel=v('travel'),age=v('age'),life=v('life'),scale=v('scale');
const base={curveSegments:28,boundsTolerance:4,surfaceOffset:.006,renderOrder:20,color:'#f0bf4b'};
export const watcherLanding={...base,projection:'ground',buckets:[{when:v('large'),id:'shock'},{when:op('gt',v('area'),mul(v('width'),v('height'),.004)),id:'puff-',sector:true},{when:true,id:'chips'}],animation:{
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
export const watcherEyeSprite={...base,projection:'surface',buckets:[{when:v('large'),id:'corona'},{when:op('and',op('gt',v('area'),mul(v('width'),v('height'),.008)),op('lt',v('cx'),0)),id:'sweep-a'},{when:op('gt',v('area'),mul(v('width'),v('height'),.008)),id:'sweep-b'},{when:true,id:'fleck-',sector:true}],animation:watcherLanding.animation};
const size=mul(.78,op('sqrt',op('max',.5,v('width')))),kick=op('exp',mul(op('sub',0,age),15));
const phase=v('phase'),particleP=v('particleP'),angle=v('angle');
const visible=op('gt',v('fade'),0),common=[['size',size],['kick',kick]],allScale=x=>({'scale.x':x,'scale.y':x,'scale.z':x});
export const watcherLaserContact={
 color:'#f0bf4b',particleShape:[['moveTo',0,.20],['bezierCurveTo',.09,.035,.075,-.07,0,-.09],['bezierCurveTo',-.075,-.07,-.09,.035,0,.20]],particleSegments:5,particles:18,
 coreRadius:.16,coreSegments:24,coreOffset:.006,renderOrder:35,coreRenderOrder:40,particleWhiteness:.38,coreWhiteness:.85,restartDistanceSquared:.8,surfaceOffset:.014,fadeDuration:.18,
 decalAnimation:{variables:common,visible,root:allScale(mul(v('size'),add(1,mul(.18,v('kick'))))),layerVariables:[['phase',op('mod',add(mul(age,3.2),mul(v('index'),.173)),1)],['alpha',v('fade')]],layers:[
  {when:eq(v('id'),'shock'),variables:[['alpha',mul(v('alpha'),.85)]],tracks:allScale(add(.73,mul(.08,op('sin',mul(age,25)))))},
  {when:op('not',eq(v('id'),'shock')),variables:[['travel',sub(1,pow(sub(1,phase),2))],['alpha',mul(v('alpha'),op('sin',mul(phase,Math.PI)))]],tracks:{...allScale(add(.42,mul(op('sin',mul(phase,Math.PI)),.45))),'position.x':mul(v('center.x'),add(.6,mul(travel,.75))),'position.y':mul(v('center.y'),add(.6,mul(travel,.75))),'position.z':mul(v('center.z'),add(.6,mul(travel,.75))),'rotation.z':mul(op('sin',mul(v('index'),2.4)),travel,.22)}},
  {tracks:{alpha:v('alpha'),time:age,flutter:.04}}
 ]},
 coreAnimation:{variables:common,visible,root:{...allScale(add(add(1.2,mul(v('kick'),.9)),mul(op('sin',mul(age,42)),.12))),alpha:v('fade')}},
 sprayAnimation:{variables:common,visible,root:allScale(v('size'))},
 particleAnimation:{visible:true,variables:[['particleP',op('mod',add(mul(age,add(1.8,mul(op('mod',v('index'),3),.17))),mul(v('index'),.618)),1)],['angle',mul(v('index'),2.399)],['travel',add(.13,mul(particleP,add(.7,mul(op('mod',v('index'),4),.13))))]],root:{
  'position.x':mul(op('cos',angle),travel),'position.y':mul(op('sin',angle),travel),'position.z':add(.02,mul(op('sin',mul(particleP,Math.PI)),add(.3,mul(op('mod',v('index'),3),.12)))),
  'rotation.x':mul(.35,op('sin',angle)),'rotation.y':mul(.35,op('cos',angle)),'rotation.z':sub(angle,Math.PI/2),
  'scale.x':mul(.35,sub(1,particleP)),'scale.y':mul(add(.45,mul(op('sin',mul(particleP,Math.PI)),.7)),sub(1,particleP)),'scale.z':1
 }}
};
