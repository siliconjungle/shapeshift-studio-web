// Shared world-space ink projection: object dimensions and sprite scale never
// enter this calculation. Perspective depth or orthographic zoom determine size.
export function projectedInkPixels(worldWidth,projectionY,viewportHeight,clipW=1){return worldWidth*Math.abs(projectionY)*viewportHeight*.5/Math.max(.0001,Math.abs(clipW));}
