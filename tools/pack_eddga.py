"""Pack the cited original Eddga sheet into idle, walk and attack rows; Pillow is only needed to regenerate."""
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[1]
im=Image.open(root/'assets/ro/sources/eddga-original.png').convert('RGBA')
rows=[[(i*104,0,(i+1)*104,132)for i in range(9)],[(i*80,135,(i+1)*80,260)for i in range(9)],[(i*100,268,(i+1)*100,399)for i in range(6)],[(600+i*84,268,600+(i+1)*84,399)for i in range(6)],[(i*110,410,(i+1)*110,570)for i in range(5)],[(550+i*100,410,550+(i+1)*100,570)for i in range(5)]]
w,h=150,170;sheet=Image.new('RGBA',(w*9,h*6))
for row,boxes in enumerate(rows):
 for col,box in enumerate(boxes):
  frame=im.crop(box);bounds=frame.getbbox()
  if bounds:frame=frame.crop(bounds)
  sheet.alpha_composite(frame,(col*w+(w-frame.width)//2,row*h+h-frame.height-5))
sheet.save(root/'assets/ro/eddga.png')
