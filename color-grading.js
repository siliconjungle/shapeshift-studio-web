// Little Gods palette adapter. Studio uses the generic rendering kernel directly.
import {GRADING_PRESETS as BASE,validateGrading as validateKernel,resolveGrading as resolveKernel,gradingValues as kernelValues,updateGradingUniforms as updateKernel} from './rendering/color-grading.js';
export {GRADING_VERSION,GRADING_CONTROLS,gradingGLSL,gradingActive,gradingUniforms} from './rendering/color-grading.js';
const neutral=BASE.neutral;
export const GRADING_PRESETS={neutral,cryos:{...neutral,contrast:1.02,saturation:.95,temperature:-.06,split:.045,shadows:'#6f83af',highlights:'#e6f3ff'},hearth:{...neutral,contrast:1.04,saturation:1.035,temperature:.075,split:.065},solis:{...neutral,contrast:1.055,saturation:.96,temperature:.13,split:.085,shadows:'#8575a4',highlights:'#ffdb9c'},void:{...neutral,contrast:1.065,saturation:.9,temperature:-.07,tint:.03,split:.09,shadows:'#626faa',highlights:'#cdbbef'}};
export function validateGrading(g){validateKernel(g);if(g?.preset!==undefined&&!['auto',...Object.keys(GRADING_PRESETS)].includes(g.preset))throw Error('Unknown grading preset');}
export const resolveGrading=(g,biome='hearth')=>resolveKernel(g,GRADING_PRESETS,biome);
export const gradingValues=(g,biome='hearth')=>kernelValues(g,GRADING_PRESETS,biome);
export const updateGradingUniforms=(u,g,biome='hearth')=>updateKernel(u,g,GRADING_PRESETS,biome);
