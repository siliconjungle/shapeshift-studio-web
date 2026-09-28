"""Bake the project's Inkwell Text font into portable SVG numeral paths."""
from pathlib import Path
import json
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.boundsPen import BoundsPen
from fontTools.pens.transformPen import TransformPen
root=Path(__file__).resolve().parent.parent
font=TTFont(root/'assets/bramble-map/fonts/InkwellText-Variable.woff2')
font=instantiateVariableFont(font,{'wght':500},inplace=True)
glyphset=font.getGlyphSet(); cmap=font.getBestCmap(); output={}
for value in range(1,21):
    glyphs=[]; advance=0
    for digit in str(value):
        name=cmap[ord(digit)]; glyphs.append((name,advance)); advance+=font['hmtx'][name][0]
    bounds=BoundsPen(glyphset)
    for name,x in glyphs: glyphset[name].draw(TransformPen(bounds,(1,0,0,1,x,0)))
    x0,y0,x1,y1=bounds.bounds; scale=88/max(x1-x0,y1-y0)
    pen=SVGPathPen(glyphset,ntos=lambda n:format(n,'.3f').rstrip('0').rstrip('.'))
    for name,x in glyphs: glyphset[name].draw(TransformPen(pen,(scale,0,0,-scale,50+(x-(x0+x1)/2)*scale,50+(y0+y1)/2*scale)))
    output[str(value)]=pen.getCommands()
folder=root/'puppet-studio/scene3d/assets/dice/inkwell'
folder.mkdir(exist_ok=True)
for value,path in output.items(): (folder/(value+'.svg')).write_text(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#142727" d="{path}"/></svg>')
(folder/'numbers.json').write_text(json.dumps(output))
(folder/'README.md').write_text('Numeral outlines from the existing assets/bramble-map/fonts/InkwellText-Variable.woff2, using wght=500, other axes at their defaults. Rebuild with python scripts/build-dice-font.py. No generated typeface or pip artwork is used.\n')
print('Baked Inkwell Text numerals 1–20 to SVG paths.')
