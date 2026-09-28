// Original synthesized cues, following Descent's short cast / impact / tail
// structure. They use the existing village spatial bus and mute preferences.
export const WISH_SOUNDS=['acorn','curse','animal-bond','call-wild','dream','uprising','violence','sleep','age-adult','age-child','age-elder','praise','scold','beast-feast','guard','play','rampage','lullaby','wood','stone','hot','cold','repair','shield','hand','friendship','enmity','select','invalid','food','energy','daybreak','nightfall','clear-skies','heartbreak','resurrect','newcomer','love','life','fire','skull','rain','crackle'].map(k=>'wish-'+k);
export function playWishSound(kind,{tone,noise}){
 if(['wish-praise','wish-beast-feast','wish-guard','wish-play'].includes(kind)){for(const [i,n]of [392,523,659].entries())tone(n,n,.4,.045,'sine',i*.1);}
 if(kind==='wish-acorn'){tone(392,523,.2,.02,'sine');tone(784,784,.4,.015,'sine',.12);}
 if(kind==='wish-curse'){tone(330,110,.48,.045,'triangle');tone(165,82,.65,.025,'sine',.12);noise(.16,.018,900,.08);}
 if(kind==='wish-scold'){tone(340,180,.28,.05,'triangle');}
 if(kind==='wish-uprising'){tone(196,196,.18,.05,'triangle');tone(294,294,.22,.045,'triangle',.12);tone(147,98,.4,.045,'triangle',.25);noise(.09,.035,1200,.25);}
 if(kind==='wish-violence'){noise(.12,.05,1000);tone(150,65,.3,.055,'triangle');}
 if(kind==='wish-animal-bond'){for(const [i,n]of [330,440,660].entries())tone(n,n,.4,.04,'sine',i*.12);}
 if(kind==='wish-call-wild'){tone(392,523,.45,.04,'sine');tone(523,659,.6,.025,'sine',.3);noise(.4,.015,2400,.15);}
 if(kind==='wish-dream'){for(const [i,n]of [784,659,523].entries())tone(n,n,.85,.025,'sine',i*.22);}
 if(kind==='wish-sleep'){for(const [i,n]of [523,440,330].entries())tone(n,n,.65,.03,'sine',i*.18);}
 if(kind==='wish-rampage'){noise(.3,.08,1200);tone(160,60,.45,.07,'sawtooth');}
 if(kind==='wish-lullaby'){for(const [i,n]of [659,523,392].entries())tone(n,n,.7,.035,'sine',i*.2);}
 if(kind==='wish-hot'){tone(210,420,.6,.045,'sine');noise(.45,.025,1100,.05)}
 if(kind==='wish-cold'){for(const [i,n]of [1046,784,659].entries())tone(n,n*.98,.45,.035,'sine',i*.1);noise(.5,.02,5000)}
 if(kind==='wish-select'){noise(.055,.025,2200);tone(720,920,.085,.035,'triangle')}
 if(kind==='wish-invalid'){tone(180,110,.12,.035,'triangle');noise(.05,.018,700)}
 if(['wish-heartbreak','wish-resurrect','wish-newcomer','wish-love','wish-life','wish-fire','wish-skull','wish-rain'].includes(kind)){tone(680,180,.16,.07,'triangle');tone(340,520,.12,.032);noise(.055,.04,3000)}
 if(kind==='wish-enmity'||kind==='wish-heartbreak'){noise(.08,.05,1700,.08);tone(620,240,.5,.05,'sine',.06);tone(410,160,.65,.04,'sine',.17)}
 if(kind==='wish-newcomer'){for(const [i,n]of [392,523,659,784].entries())tone(n,n,.38,.045,'sine',.07+i*.1);noise(.35,.02,5000,.1)}
 if(kind==='wish-resurrect'){for(const [i,n]of [261,392,523,784].entries())tone(n,n*1.008,.65,.045,'sine',.08+i*.14);noise(.6,.022,4800,.15)}
 if(kind==='wish-love'){tone(330,330,.32,.065,'sine',.06);tone(440,440,.36,.055,'sine',.17);tone(660,660,.55,.04,'sine',.3);tone(110,75,.14,.035,'sine',.12);tone(110,75,.14,.026,'sine',.3)}
 if(['wish-age-adult','wish-age-child','wish-age-elder','wish-wood','wish-stone','wish-repair','wish-shield','wish-hand','wish-friendship','wish-life','wish-food','wish-energy','wish-daybreak','wish-clear-skies'].includes(kind)){for(const [i,n]of [523,659,784,1046].entries())tone(n,n*1.015,.44,.055,'sine',.07+i*.09);noise(.45,.025,6200,.08)}
 if(kind==='wish-nightfall'){for(const [i,n]of [784,659,523,392].entries())tone(n,n*.995,.6,.04,'sine',.06+i*.14)}
 if(kind==='wish-fire'){noise(.45,.14,2900,.03);tone(260,48,.32,.09,'sawtooth',.03);noise(.11,.055,4400,.26)}
 if(kind==='wish-skull'){tone(190,36,.65,.10,'triangle',.04);tone(370,70,.4,.04,'sine',.03);noise(.45,.075,900,.06);tone(95,40,.15,.065,'sine',.8);noise(.16,.055,1200,.8)}
 if(kind==='wish-rain'){noise(1.2,.08,3400,.04);for(let i=0;i<6;i++)tone(1050+i*130,440,.085,.035,'sine',.1+i*.095);tone(90,40,.6,.04,'sine',.13)}
 if(kind==='wish-crackle'){noise(.16,.032,2400);noise(.045,.024,4200,.1);tone(105,55,.13,.016)}
}
