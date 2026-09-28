export const CHARACTER_POSES=['idle','anticipate','windup','attack','reach','recover','hurt','recoil','victory','defeat'];
export const POSE_SEQUENCES={
 windup:[[0,'idle'],[.16,'anticipate'],[.42,'windup'],[.76,'anticipate'],[1,'idle']],
 attack:[[0,'windup'],[.12,'attack'],[.27,'reach'],[.43,'attack'],[.58,'recover'],[.82,'anticipate'],[1,'idle']],
 hurt:[[0,'hurt'],[.25,'recoil'],[.43,'hurt'],[.58,'recoil'],[.79,'recover'],[1,'idle']],
 defeat:[[0,'hurt'],[.25,'recoil'],[.5,'defeat'],[1,'defeat']],
 dodge:[[0,'anticipate'],[.25,'windup'],[.65,'recover'],[1,'idle']],
 victory:[[0,'anticipate'],[.2,'victory'],[1,'victory']]
};
export function poseAtProgress(sequence,progress){let pose=sequence[0][1];for(const [at,next]of sequence){if(at>progress)break;pose=next;}return pose;}
// Dense transform keys interpolate continuously between the illustrated poses.
export function motionFrames(kind,d=1){
 const make=(x,y,sx,sy,r,offset)=>({transform:`translate(${x*d}px,${y}px) rotate(${r*d}deg) scale(${sx},${sy})`,offset});
 if(kind==='attack')return [make(-5,0,1.06,.93,-2,0),make(-8,2,1.1,.86,-3,.1),make(12,-3,.94,1.08,2,.2),make(28,-2,1.12,.91,5,.3),make(21,0,1.06,.97,3,.43),make(12,0,.95,1.06,1,.58),make(5,1,1.04,.96,-1,.73),make(1,-1,.985,1.02,0,.87),make(0,0,1,1,0,1)];
 if(kind==='hurt'||kind==='defeat')return [make(0,2,1.2,.75,0,0),make(-12,-5,.88,1.12,-6,.12),make(-23,-8,.78,1.2,-11,.24),make(-18,-2,.95,1.04,-8,.36),make(-10,3,1.17,.82,-4,.48),make(-6,-2,.92,1.08,2,.62),make(-3,1,1.06,.95,-1,.76),make(-1,-1,.99,1.025,0,.9),make(0,0,1,1,0,1)];
 if(kind==='victory')return [make(0,0,1,1,0,0),make(0,3,1.14,.82,0,.15),make(0,-12,.9,1.13,-3,.28),make(0,-24,.96,1.05,2,.4),make(0,-11,1,1,1,.55),make(0,3,1.12,.86,0,.7),make(0,-3,.96,1.06,0,.84),make(0,0,1,1,0,1)];
 if(kind==='dodge')return [make(0,0,1,1,0,0),make(-8,-1,.95,1.05,-3,.18),make(-22,-2,.9,1.07,-7,.4),make(-16,0,1.04,.95,-3,.62),make(-5,0,.98,1.02,0,.83),make(0,0,1,1,0,1)];
 return [make(0,0,1,1,0,0),make(-2,0,1.02,.98,-1,.18),make(-5,1,1.06,.94,-2,.4),make(-6,2,1.09,.91,-3,.55),make(-3,0,.98,1.02,-1,.78),make(0,0,1,1,0,1)];
}
