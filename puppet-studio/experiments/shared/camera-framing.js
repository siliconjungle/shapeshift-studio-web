// An orthographic view does not change scale when the camera moves back.
// Keep the eye well outside the terrain, including when panning toward its rear.
export const VIEW_DISTANCE=128;
export const VIEW_NEAR=.1;
export const VIEW_FAR=320;

// Overhead, drag the ground with the pointer. Near ground level, use a
// constant ground-plane travel rate instead of dividing by a tiny sine.
// Blend the two so tilting never switches the controls abruptly.
export function panCameraOnGround(target,dx,dy,units,yaw,elevation){
 const t=Math.max(0,Math.min(1,(elevation-.28)/(.60-.28))),blend=t*t*(3-2*t);
 const depthScale=1+blend*(1/Math.sin(Math.max(.28,elevation))-1);
 const sideways=dx*units,forward=dy*units*depthScale;
 target.x-=sideways*Math.cos(yaw)+forward*Math.sin(yaw);
 target.z+=sideways*Math.sin(yaw)-forward*Math.cos(yaw);
 return target;
}

// Keep the chosen screen point fixed while changing an orthographic zoom.
// Translate along the ground, preserving camera height and its tilt.
export function anchorCameraZoom(target,oldZoom,newZoom,x,y,rect,halfHeight,yaw,elevation){
 if(!Number.isFinite(x)||!Number.isFinite(y)||oldZoom===newZoom)return;
 const horizontal=((x-rect.left)/rect.width*2-1)*halfHeight*rect.width/rect.height;
 const vertical=(1-(y-rect.top)/rect.height*2)*halfHeight;
 const change=1/oldZoom-1/newZoom,dx=horizontal*change,dy=vertical*change/Math.sin(elevation);
 target.x+=Math.cos(yaw)*dx-Math.sin(yaw)*dy;
 target.z-=Math.sin(yaw)*dx+Math.cos(yaw)*dy;
}

// Interior ground edges hide the outer cut faces, as in the original woodland.
