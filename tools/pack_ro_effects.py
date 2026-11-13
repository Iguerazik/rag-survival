"""Pack the three cited Ragnarok source sheets into runtime atlases. Requires Pillow only to regenerate."""
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]/'assets/fx/ro-catalog'
def strip(name,frames,size):
    out=Image.new('RGBA',(size[0]*len(frames),size[1]))
    for i,frame in enumerate(frames):
        box=frame.getbbox()
        if box:frame=frame.crop(box)
        frame.thumbnail(size,Image.Resampling.NEAREST)
        out.alpha_composite(frame,(i*size[0]+(size[0]-frame.width)//2,size[1]-frame.height))
    out.save(ROOT/(name+'.png'))
frost=Image.open(ROOT/'source-frost.png').convert('RGBA')
pixels=frost.load()
for y in range(frost.height):
    for x in range(frost.width):
        r,g,b,a=pixels[x,y]
        if r==255 and g==0 and b==255:pixels[x,y]=(r,g,b,0)
crystal=frost.crop((0,0,128,136));frames=[]
for scale in [.35,.5,.7,.85,1,1,.9,.7]:
    frame=crystal.resize((round(crystal.width*scale),round(crystal.height*scale)),Image.Resampling.NEAREST);frames.append(frame)
strip('frost-crystal',frames,(128,144))
blessing=Image.open(ROOT/'source-blessing.png').convert('RGBA')
strip('blessing-angels',[blessing.crop((i*62,0,(i+1)*62,76)) for i in range(12)],(72,88))
dragon=Image.open(ROOT/'source-dragon.png').convert('RGBA')
boxes=[(0,0,210,220),(220,0,420,220),(430,0,645,225),(650,0,870,225),(0,230,215,450),(220,230,430,450),(440,230,650,450),(650,230,870,450),(0,465,210,673),(220,465,430,673)]
strip('dragon-flame',[dragon.crop(box) for box in boxes],(224,224))
print('Packed 3 Ragnarok effect atlases.')
