const v=n=>['var',n],o=(n,...a)=>[n,...a],add=(...a)=>o('add',...a),sub=(a,b)=>o('sub',a,b),mul=(...a)=>o('mul',...a),div=(a,b)=>o('div',a,b),pow=(a,b)=>o('pow',a,b),sin=a=>o('sin',a),cos=a=>o('cos',a),clamp=a=>o('clamp',a,0,1),ease=a=>o('smooth',a),mod=(a,b)=>o('mod',a,b),starts=s=>o('startsWith',v('id'),s),eq=(a,b)=>o('eq',a,b),allScale=x=>({'scale.x':x,'scale.y':x,'scale.z':x});
const i=v('sector'),age=v('age'),p=v('p'),phase=v('phase'),kick=v('kick'),tail=v('tail'),angle=v('angle'),radius=v('radius');
const rings=Array.from({length:3},(_,i)=>'ring-'+i),motes=Array.from({length:14},(_,i)=>'mote-'+i),drops=Array.from({length:24},(_,i)=>'drop-'+i),splashRings=['splash-ring-0','splash-ring-1'];
export const watcherEffects={color:'#f0bf4b',geometry:{
 ...Object.fromEntries([.22,.14,.078,.033].map((r,i)=>['beam-'+i,{type:'cylinder',args:[r,r,1,16]}])),ring:{type:'ring',args:[.94,1,48]},mote:{type:'sphere',args:[.035,6,4]},core:{type:'sphere',args:[.13,16,12]},drop:{type:'shape',segments:8,path:[['moveTo',0,.35],['bezierCurveTo',.08,.12,.13,-.08,0,-.12],['bezierCurveTo',-.13,-.08,-.08,.12,0,.35]]},splashRing:{type:'ring',args:[.95,1,40]}
 },root:{id:'effects',children:[{id:'beam',visible:false,children:[.12,.3,.9,1].map((alpha,i)=>({id:'beam-'+i,geometry:'beam-'+i,alpha}))},{id:'charge',visible:false,children:[...rings.map(id=>({id,geometry:'ring'})),...motes.map(id=>({id,geometry:'mote'})),{id:'core',geometry:'core'}]},{id:'splash',visible:false,scale:[1.2,1.2,1.2],children:[...drops.map(id=>({id,geometry:'drop'})),...splashRings.map(id=>({id,geometry:'splashRing'}))]}]},
 whiteness:Object.fromEntries([...Array.from({length:4},(_,i)=>['beam-'+i,[0,.15,.62,.94][i]]),...rings.map((id,i)=>[id,i===1?.75:.1]),...motes.map((id,i)=>[id,i%3?.3:.85]),['core',.88],...drops.map((id,i)=>[id,[.85,.12,0,.65][i%4]]),...splashRings.map((id,i)=>[id,i?.7:.1])]),
 programs:{
 charge:{root:'charge',targets:[...rings,...motes,'core'],animation:{variables:[['p',clamp(v('progress'))],['pulse',add(.5,mul(.5,sin(mul(add(mul(p,3),mul(p,p,7)),Math.PI,2))))]],visible:true,root:allScale(1),layers:[
 {when:starts('ring-'),variables:[['phase',mod(add(mul(p,add(1.7,mul(p,1.8))),div(i,3)),1)]],tracks:{'position.z':0,...allScale(add(.12,mul(sub(1,phase),sub(.62,mul(p,.2))))),alpha:mul(sin(mul(phase,Math.PI)),add(.2,mul(p,.5)))}},
 {when:starts('mote-'),variables:[['phase',mod(add(mul(p,add(1.5,mul(p,2))),div(i,v('moteCount'))),1)],['angle',add(mul(i,2.399),mul(p,5))],['radius',mul(sub(1,phase),add(.7,mul(.12,mod(i,3))))]],tracks:{'position.x':mul(cos(angle),radius),'position.y':mul(sin(angle),radius),'position.z':add(.04,mul(phase,.04)),...allScale(add(.3,mul(p,.8))),alpha:mul(sin(mul(phase,Math.PI)),ease(o('min',1,mul(p,4))))}},
 {when:eq(v('id'),'core'),tracks:{...allScale(add(.15,mul(p,p,add(1.1,mul(v('pulse'),.2))))),alpha:add(.15,mul(p,.85))}}
 ]}},
 fire:{root:'charge',targets:[...rings,...motes,'core'],animation:{variables:[['kick',o('exp',mul(sub(0,age),13))],['tail',sub(1,ease(div(sub(age,1.62),.18)))]],visible:true,root:allScale(1),layers:[
 {when:starts('ring-'),variables:[['phase',mod(add(mul(age,2.3),div(i,3)),1)]],tracks:{'position.z':add(.025,mul(phase,.22)),...allScale(add(.11,mul(phase,add(.38,mul(kick,.17))))),alpha:mul(pow(sub(1,phase),2),add(.2,mul(kick,.35)),tail)}},
 {when:starts('mote-'),variables:[['phase',mod(add(mul(age,1.8),div(i,v('moteCount'))),1)],['angle',mul(i,2.399)],['radius',add(.09,mul(phase,add(.55,mul(kick,.2))))]],tracks:{'position.x':mul(cos(angle),radius),'position.y':mul(sin(angle),radius),'position.z':add(.035,mul(phase,.22)),...allScale(mul(add(.55,mul(kick,.4)),sub(1,mul(phase,.65)))),alpha:mul(sin(mul(phase,Math.PI)),add(.5,mul(kick,.4)),tail)}},
 {when:eq(v('id'),'core'),tracks:{...allScale(add(add(.72,mul(kick,.65)),mul(.05,sin(mul(age,28))))),alpha:mul(add(.55,mul(kick,.35)),tail)}}
 ]}},
 splash:{root:'splash',targets:[...drops,...splashRings],animation:{visible:o('lt',age,1),layers:[
 {when:starts('drop-'),variables:[['angle',mul(i,2.399)],['travel',sub(1,pow(sub(1,age),3))],['radius',mul(v('travel'),add(.5,mul(mod(i,5),.17)))]],tracks:{'position.x':mul(cos(angle),radius),'position.y':sub(mul(sin(angle),radius),mul(age,age,.23)),'position.z':add(.025,mul(sin(mul(age,Math.PI)),.2)),'rotation.z':sub(angle,Math.PI/2),'scale.x':add(.2,mul(mod(i,3),.07)),'scale.y':mul(add(.3,mul(mod(i,4),.12)),sub(1,mul(age,.4))),'scale.z':1,alpha:sub(1,ease(div(sub(age,.35),.65)))}},
 {when:starts('splash-ring-'),variables:[['phase',clamp(sub(mul(age,1.3),mul(i,.1)))]],tracks:{...allScale(add(.06,mul(phase,add(.8,mul(i,.3))))),alpha:mul(sin(mul(phase,Math.PI)),.65)}}
 ]}}
 }
};
