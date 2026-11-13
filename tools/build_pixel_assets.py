#!/usr/bin/env python3
"""Regenerate standalone 2D pixel sprite assets (Pillow), no game-runtime dependencies.
Icons and effects are original RO-inspired pixel artwork, not extracted GRF sprites.
"""
from pathlib import Path
from PIL import Image, ImageDraw
from math import sin, cos, pi
import random, re, json
ROOT=Path(__file__).resolve().parents[1]
ITEMS=ROOT/'assets/items'; ITEMS.mkdir(parents=True, exist_ok=True)
FX=ROOT/'assets/fx'; FX.mkdir(parents=True,exist_ok=True)
RO=ROOT/'assets/ro'
source=(ROOT/'items.js').read_text()
# gather all named items from the existing dictionary without editing its data
item_data={}
for line in source.splitlines():
    m=re.match(r'  (\w+): (weaponItem|armorItem)\(\'([^\']+)\', \'([^\']+)\',',line)
    if m:
        id,fn,name,kind=m.groups()
        tier=int((re.findall(r',\s*(\d)\s*,\s*(?:\[|null)',line) or ['2'])[0]) if False else 1
        # Recover tier from weaponItem(..., attack, slots, tier,..) or armorItem(..., def, slots, tier,...)
        ints=re.findall(r'\b\d+\b',line.split('),')[0])
        if len(ints)>=3: tier=int(ints[2])
        item_data[id]={'name':name,'kind':kind,'tier':tier,'type':'weapon' if fn=='weaponItem' else kind}
assert len(item_data)>=60,len(item_data)
PAL={1:('#a6b6bf','#e5e8db','#777d85','#49616b'),2:('#d5b66e','#fff0b5','#967d52','#584c36'),3:('#74b6ce','#d7ffff','#3a7998','#4b536c'),4:('#d0a1de','#ffe1fe','#7b4aa3','#493b69')}
def px(d,pts,fill,width=1):d.line(pts,fill=fill,width=width,joint='curve')
def item_icon(id,info):
    rng=random.Random(id)
    tier=min(4,max(1,info['tier']))
    base,hi,shadow,hilt=PAL[tier]
    I=Image.new('RGBA',(36,36)); d=ImageDraw.Draw(I)
    # ground shadow to emphasize object shapes
    d.ellipse((7,27,29,32),fill=(0,0,0,58))
    typ=info['type']; kind=info['kind']; variant=sum(map(ord,id))%4
    if typ=='weapon':
        if kind in ('Espada','Espada de duas mãos','Adaga','Katar'):
            katar=kind=='Katar'; blade_len=19 if 'duas' in kind else 16 if kind=='Espada' else 13
            # slanted angular steel blade, specular edges; variant guard and length
            d.polygon([(9,27),(12,23),(24,10),(29,5),(30,9),(26,14),(16,25),(13,29)],fill=shadow)
            d.polygon([(11,24),(25,8),(29,6),(27,11),(15,26)],fill=base)
            d.polygon([(15,22),(29,6),(27,11)],fill=hi)
            if katar:
                d.polygon([(10,23),(5,18),(9,15),(17,20)],fill=base)
                d.polygon([(13,27),(19,31),(23,28),(19,23)],fill=hi)
            px(d,[(7,21),(15,29)],hilt,3)
            px(d,[(9,28),(5,32)],shadow,3);d.ellipse((3,29,7,33),fill=hi)
        elif kind=='Arco':
            d.arc((5,3,32,32),80,282,fill=base,width=4)
            d.arc((7,5,30,30),84,282,fill=hi,width=2)
            px(d,[(23,4),(16,17),(23,30)],'#f8efe2',1)
            px(d,[(10,16),(29,16)],hilt,2)
            d.polygon([(30,16),(24,12),(24,20)],fill=base)
        elif kind=='Cajado':
            px(d,[(9,30),(23,7)],shadow,5);px(d,[(10,29),(24,7)],hilt,3)
            d.ellipse((17,2,31,14),fill=shadow);d.ellipse((20,4,29,12),fill=base)
            d.ellipse((22,4,26,9),fill=hi)
            for j in range(3):d.point((rng.randint(17,32),rng.randint(2,13)),fill=hi)
        elif kind in ('Maça','Machado','Machado de duas mãos'):
            px(d,[(9,29),(24,8)],shadow,5);px(d,[(10,28),(24,8)],hilt,3)
            if 'Machado' in kind:
                d.polygon([(22,5),(30,5),(34,10),(30,17),(21,19),(17,12)],fill=shadow)
                d.polygon([(23,6),(30,6),(32,10),(28,15),(23,15)],fill=base)
                d.polygon([(23,6),(30,6),(31,9)],fill=hi)
            else:
                d.rounded_rectangle((16,4,32,15),radius=3,fill=shadow)
                d.rectangle((18,5,30,12),fill=base)
                for xx in [19,27]: d.rectangle((xx,4,xx+2,7),fill=hi)
    elif typ=='armor':
        d.polygon([(12,5),(17,7),(22,7),(27,5),(32,12),(27,17),(27,30),(9,30),(9,17),(4,12),(9,5)],fill=shadow)
        d.polygon([(12,7),(17,10),(22,10),(26,7),(30,12),(25,16),(25,28),(11,28),(11,16),(6,12)],fill=base)
        d.polygon([(14,9),(18,13),(22,9),(22,25),(13,25)],fill=hi)
        d.rectangle((13,19,25,21),fill=shadow)
        d.polygon([(17,13),(19,13),(20,18),(18,19),(16,17)],fill=hilt)
    elif typ=='shield':
        d.polygon([(18,3),(31,8),(30,23),(18,32),(6,23),(5,8)],fill=shadow)
        d.polygon([(18,5),(29,10),(28,22),(18,29),(8,22),(7,10)],fill=base)
        d.polygon([(18,7),(25,11),(24,21),(18,26)],fill=hi)
        d.polygon([(17,10),(20,10),(21,25),(16,25)],fill=hilt)
        d.rectangle((10,14,26,17),fill=hilt)
    elif typ=='garment':
        d.polygon([(12,4),(24,4),(32,31),(21,27),(18,30),(13,27),(4,31)],fill=shadow)
        d.polygon([(13,6),(23,6),(29,28),(21,24),(18,28),(14,24),(7,28)],fill=base)
        d.polygon([(17,8),(23,7),(27,26),(20,22)],fill=hi)
        d.ellipse((15,5,21,11),fill=hilt)
    elif typ=='shoes':
        for yy,xx in [(8,4),(19,16)]:
            d.polygon([(xx+6,yy),(xx+16,yy+1),(xx+17,yy+12),(xx+11,yy+16),(xx,yy+14),(xx+1,yy+9)],fill=shadow)
            d.polygon([(xx+7,yy+2),(xx+15,yy+2),(xx+15,yy+11),(xx+10,yy+14),(xx+2,yy+12)],fill=base)
            d.rectangle((xx+7,yy+3,xx+12,yy+5),fill=hi)
    elif typ=='headgear':
        if id in ('ribbon',):
            d.polygon([(18,15),(5,6),(5,22),(17,21)],fill=base)
            d.polygon([(18,15),(31,6),(31,22),(19,21)],fill=hi)
            d.ellipse((14,13,22,22),fill=shadow)
        else:
            d.ellipse((5,11,31,29),fill=shadow)
            d.arc((6,9,30,27),185,350,fill=base,width=7)
            d.rectangle((5,21,31,24),fill=hi)
            if id=='helm': d.polygon([(13,8),(18,1),(23,8)],fill=hi)
    elif typ=='accessory':
        d.ellipse((7,10,29,31),fill=shadow)
        d.ellipse((10,12,27,28),fill=base)
        d.ellipse((14,15,23,24),fill=(25,24,39,0))
        d.polygon([(18,6),(12,14),(18,20),(25,14)],fill=shadow)
        d.polygon([(18,8),(14,14),(18,18),(23,14)],fill=hi)
        d.point((17,12),fill='#ffffff')
    # minute palette detail / glimmer
    if tier>=3:
        d.line([(28,4),(28,9)],fill=hi,width=1);d.line([(26,6),(30,6)],fill=hi,width=1)
    return I.resize((72,72),resample=Image.Resampling.NEAREST)
icons=[]
for id,info in item_data.items():
    im=item_icon(id,info);im.save(ITEMS/(id+'.png'),optimize=True)
    icons.append((id,im))
cols=8;rows=(len(icons)+cols-1)//cols
atlas=Image.new('RGBA',(72*cols,72*rows),(18,25,34,255));ad=ImageDraw.Draw(atlas)
for i,(id,im) in enumerate(icons):
    x=i%cols*72;y=i//cols*72
    ad.rectangle((x,y,x+71,y+71),outline=(98,91,78,255),width=1)
    atlas.alpha_composite(im,(x,y))
atlas.save(ITEMS/'atlas.png',optimize=True)

# Three original boss sprites, with static 8-direction silhouettes & four idle frames.
def boss_body(d,id,frame,direction):
    rng=random.Random(f'{id}/{frame}/{direction}')
    bob=(frame%3)-1
    outline='#1c1e24'
    # bottom ground shadow
    d.ellipse((10,43,40,50),fill=(0,0,0,62))
    if id=='orc_hero':
        d.polygon([(14,25+bob),(39,24+bob),(42,42+bob),(34,45+bob),(25,39+bob),(17,45+bob),(10,42+bob)],fill=outline)
        d.polygon([(15,26+bob),(38,26+bob),(39,41+bob),(33,42+bob),(26,38+bob),(17,42+bob),(12,41+bob)],fill='#617638')
        d.rectangle((19,13+bob,35,27+bob),fill=outline)
        d.rectangle((21,15+bob,33,25+bob),fill='#84ad4e')
        # steel shoulders, heavy breastplate
        d.polygon([(18,25+bob),(26,30+bob),(33,25+bob),(36,40+bob),(15,40+bob)],fill='#687d8a')
        d.polygon([(18,27+bob),(26,31+bob),(26,37+bob),(17,37+bob)],fill='#9daeb3')
        d.ellipse((16,12+bob,37,25+bob),fill=outline)
        d.ellipse((18,14+bob,35,24+bob),fill='#668d41')
        d.polygon([(19,17+bob),(12,14+bob),(11,5+bob),(20,11+bob)],fill='#c3b48d')
        d.polygon([(34,17+bob),(41,14+bob),(42,6+bob),(33,11+bob)],fill='#c3b48d')
        d.rectangle((21,18+bob,24,19+bob),fill='#e4ed9d');d.rectangle((30,18+bob,33,19+bob),fill='#e4ed9d')
        d.line((6,37+bob,8,8+bob),fill='#543529',width=4)
        d.polygon([(2,8+bob),(13,3+bob),(18,9+bob),(11,17+bob),(3,15+bob)],fill='#94a3b9')
    elif id=='doppelganger':
        d.polygon([(20,16+bob),(33,16+bob),(46,47+bob),(27,43+bob),(5,47+bob)],fill=outline)
        d.polygon([(20,18+bob),(32,18+bob),(40,43+bob),(27,39+bob),(12,43+bob)],fill='#48305b')
        d.rectangle((17,21+bob,37,40+bob),fill='#545065')
        d.rectangle((21,22+bob,33,37+bob),fill='#888899')
        d.ellipse((17,6+bob,38,28+bob),fill=outline)
        d.ellipse((20,8+bob,35,25+bob),fill='#353546')
        d.polygon([(19,8+bob),(26,3+bob),(35,8+bob),(38,19+bob),(15,19+bob)],fill='#7b7b8c')
        d.rectangle((21,17+bob,24,19+bob),fill='#fd364e');d.rectangle((31,17+bob,34,19+bob),fill='#fd364e')
        for side in [-1,1]:
            hx=6 if side==-1 else 46
            d.line((hx,34+bob,hx+(3 if side==1 else -3),9+bob),fill='#b9d6e9',width=3)
            d.line((hx-3,33+bob,hx+3,33+bob),fill='#b988a4',width=3)
    elif id=='eddga':
        # orange tiger with broad striped torso and curved tail
        d.polygon([(10,24+bob),(40,24+bob),(43,40+bob),(35,46+bob),(15,46+bob),(7,39+bob)],fill=outline)
        d.polygon([(11,26+bob),(39,26+bob),(40,39+bob),(34,44+bob),(16,44+bob),(9,39+bob)],fill='#d58d3a')
        d.ellipse((13,5+bob,39,31+bob),fill=outline)
        d.ellipse((15,7+bob,37,29+bob),fill='#e7a44c')
        d.polygon([(16,12+bob),(14,1+bob),(25,8+bob)],fill=outline)
        d.polygon([(34,12+bob),(39,1+bob),(27,8+bob)],fill=outline)
        d.polygon([(16,10+bob),(16,5+bob),(22,9+bob)],fill='#eebc6c')
        d.polygon([(34,10+bob),(38,5+bob),(29,9+bob)],fill='#eebc6c')
        for xx in [18,29]:
            d.rectangle((xx,16+bob,xx+4,18+bob),fill='#2c2926')
        d.polygon([(24,19+bob),(27,19+bob),(25,23+bob)],fill='#63413c')
        for yy in [30,37]:
            d.line((13,yy+bob,21,yy+3+bob),fill='#5d3022',width=2)
            d.line((32,yy+3+bob,39,yy+bob),fill='#5d3022',width=2)
        d.arc((35,12+bob,49,44+bob),250,470,fill='#cc6b27',width=4)
        d.ellipse((41,7+bob,49,16+bob),fill='#ed6c27')
        d.ellipse((43,8+bob,48,13+bob),fill='#ffce63')
    # few action-frame glints
    if frame%3==0:
        for _ in range(3):
            x,y=rng.randrange(5,45),rng.randrange(2,32)
            d.point((x,y),fill=(250,239,194,160))
metadata={}
for boss in ['orc_hero','doppelganger','eddga']:
    sheet=Image.new('RGBA',(96*4,104*8))
    for direction in range(8):
        for frame in range(4):
            image=Image.new('RGBA',(52,52));draw=ImageDraw.Draw(image)
            boss_body(draw,boss,frame,direction)
            image=image.resize((104,104),Image.Resampling.NEAREST)
            # cropped 4 pixels across width, preserving center
            sheet.paste(image.crop((4,0,100,104)),(frame*96,direction*104))
    sheet.save(RO/f'{boss}.png',optimize=True)
    metadata[boss]={'w':96,'h':104,'ox':48,'oy':91,'actions':{str(i):[i,4] for i in range(8)}}
(RO/'v4-bosses.js').write_text("'use strict';\n// Standalone original fan sprites: idle variations across 8 directions.\nObject.assign(roSpriteData, "+json.dumps(metadata,ensure_ascii=False,separators=(',',':'))+");\n")

# Skill VFX: individual pixel-sheet effects. Each sprite has eight 96x96 frames.
SKILLS={
 'bash':'slash','pierce':'slash','bowling':'slash','sonicblow':'slash','rolling':'slash','axetornado':'slash','grimtooth':'slash','counterslash':'slash',
 'souldestroyer':'dark','napalm':'dark','spirit':'dark','ripper':'dark',
 'fire':'flame','magnum':'flame','ignition':'flame','crimson':'flame','comet':'meteor','cartterm':'flame',
 'frost':'ice','stormgust':'ice','storm':'ice',
 'lightning':'bolt','vermilion':'bolt','armcannon':'bolt',
 'arrows':'arrows','shower':'arrows','arrowstorm':'arrows','aimed':'arrows','precise':'arrows','wargstrike':'arrows',
 'heal':'holy','blessing':'holy','holy':'holy','judex':'holy','adoramus':'holy','magnus':'holy','sanctuary':'holy','assumptio':'holy','praefatio':'holy',
 'hammerfall':'impact','mammon':'impact','axeboom':'impact','cartrev':'impact',
 'agiup':'buff','endure':'buff','overthrust':'buff','concentration':'buff','charge':'slash',
}
PALETTES={
 'slash':('#fff7d6','#ffc876','#f5755c'), 'dark':('#f8d7ff','#9c66c7','#452c80'),
 'flame':('#fffbd7','#ffbb4f','#f04631'),'meteor':('#fffbd4','#ff9e48','#bc3449'),
 'ice':('#f0ffff','#9ce4ff','#487eeb'), 'bolt':('#ffffff','#eee59a','#a06adf'),
 'arrows':('#fffbd2','#dbd4a4','#b87a42'),'holy':('#ffffff','#c7f4dc','#7bc6cf'),
 'impact':('#fff7d8','#edb658','#aa653d'),'buff':('#fff6d8','#b0f2d2','#52a5c6'),
}
def draw_effect(d,kind,p,skill,seed):
  bright,mid,dark=PALETTES[kind];rng=random.Random(seed);cx,cy=48,57
  # progressive alpha decay, no translucency in center of strike
  if kind in ('slash','dark'):
    count=3 if skill in ('sonicblow','rolling','axetornado') else 1
    for q in range(count):
      center=(p*.9+q/max(1,count)) * (pi*1.55)
      rad=26+q*5+18*sin(p*pi)
      for j in range(7):
        theta=center + (j/7-.5)*2.1 + q*.7
        x=cx+cos(theta)*rad;y=cy+sin(theta)*rad*.63
        n=3 if j%3 else 6
        d.rectangle((x-n,y-n,x+n,y+n),fill=mid if j%2 else bright)
      # dark blades emit extra purple projectiles
      if kind=='dark':
        for j in range(8):
          a=j*pi/4+p
          r=10+34*p
          d.ellipse((cx+cos(a)*r-3,cy+sin(a)*r*.65-3,cx+cos(a)*r+3,cy+sin(a)*r*.65+3),fill=dark)
  elif kind in ('flame','meteor'):
    if kind=='meteor':
      y=-35+105*p
      d.ellipse((26,y,72,y+48),fill=dark)
      d.ellipse((32,y+4,65,y+42),fill=mid)
      d.ellipse((38,y+10,59,y+29),fill=bright)
      for j in range(5):
        x=30+j*9
        d.line((x,y-22,x-4,y+9),fill=mid,width=3)
    else:
      for j in range(13):
        a=2*pi*j/13+(.12 if seed%2 else -.12)
        r=(13+29*p)*(1-.35*abs(sin(a)))
        x=cx+cos(a)*r;y=cy+sin(a)*r*.65
        hh=6+22*sin(pi*p)+rng.randrange(1,15)
        d.polygon([(x-4,y),(x+4,y),(x+2,y-hh),(x,y-hh-6),(x-3,y-hh//2)],fill=dark)
        d.polygon([(x-2,y),(x+3,y),(x,y-hh*.7)],fill=mid)
      d.ellipse((cx-9,cy-10,cx+9,cy+7),fill=bright)
  elif kind=='ice':
    for j in range(9 if skill=='stormgust' else 6):
      a=2*pi*j/(9 if skill=='stormgust' else 6)
      x=cx+cos(a)*26;y=cy+sin(a)*14
      h=(10+32*sin(pi*p))*(1+(j%3)*.16)
      d.polygon([(x-5,y),(x+5,y),(x+2,y-h),(x,y-h-11),(x-2,y-h)],fill=mid)
      d.line((x,y-3,x,y-h),fill=bright,width=2)
    for j in range(4):
      a=j*pi/2+p*3
      x=cx+cos(a)*30;y=cy+sin(a)*22
      d.rectangle((x-2,y-2,x+2,y+2),fill=bright)
  elif kind=='bolt':
    for j in range(3 if skill=='vermilion' else 1):
      x=cx+(j-1)*19
      bends=[(x-8,4),(x+7,25),(x-7,37),(x+3,57),(x-4,75)]
      pts=bends[:max(2,round(p*4)+2)]
      d.line(pts,fill=dark,width=9)
      d.line(pts,fill=mid,width=6)
      d.line(pts,fill=bright,width=2)
      d.ellipse((x-10,cy+12,x+10,cy+20),outline=mid,width=3)
  elif kind=='arrows':
    count={'arrows':3,'shower':10,'arrowstorm':16,'aimed':1,'precise':1,'wargstrike':3}.get(skill,6)
    for j in range(count):
      x=cx+(j%7-3)*11+(rng.random()-.5)*5
      y=-15+90*p-(j%3)*5
      d.line((x-5,y-13,x+2,y+4),fill=mid,width=2)
      d.polygon([(x+1,y+6),(x-4,y),(x+6,y)],fill=bright)
  elif kind=='holy':
    for j in range(16):
      a=j*pi/8 + p*pi*.6
      r=15+28*sin(p*pi)
      x=cx+cos(a)*r;y=cy+sin(a)*r*.57
      d.rectangle((x-2,y-2,x+2,y+2),fill=mid if j%2 else bright)
    d.ellipse((cx-12,cy-10,cx+12,cy+6),outline=mid,width=2)
    d.rectangle((cx-2,cy-30,cx+2,cy+11),fill=bright)
    d.rectangle((cx-12,cy-16,cx+12,cy-11),fill=bright)
    if skill in ['heal','sanctuary']:
      for j in range(4):
        x=cx+(j-1.5)*14;y=cy-30+20*p
        d.line((x,y,x,y-12),fill=mid,width=2)
  elif kind=='impact':
    for j in range(12):
      a=j*pi/6
      r=11+38*p
      x=cx+cos(a)*r;y=cy+sin(a)*r*.6
      d.line((cx,cy,x,y),fill=dark,width=4)
      d.rectangle((x-3,y-3,x+3,y+3),fill=mid)
    d.ellipse((cx-11,cy-12,cx+11,cy+10),fill=bright)
  elif kind=='buff':
    for j in range(12):
      a=j*pi/6+p*pi
      r=17+14*sin(p*pi)
      x=cx+cos(a)*r;y=cy+sin(a)*r*.65
      d.rectangle((x-3,y-3,x+3,y+3),fill=mid)
    d.line((cx,cy+14,cx,cy-16),fill=bright,width=4)
    d.polygon([(cx-9,cy-8),(cx,cy-25),(cx+9,cy-8)],fill=bright)
  # particles vary across skill
  for j in range(5):
    x=rng.randrange(15,82);y=rng.randrange(18,78)
    if rng.random()<p: d.point((x,y),fill=bright)
manifest={}
for skill,kind in SKILLS.items():
  sheet=Image.new('RGBA',(96*8,96))
  for fr in range(8):
    sprite=Image.new('RGBA',(96,96));d=ImageDraw.Draw(sprite)
    draw_effect(d,kind,fr/7,skill,hash(skill)*31+fr)
    sheet.paste(sprite,(fr*96,0))
  sheet.save(FX/f'{skill}.png',optimize=True)
  manifest[skill]={'file':f'{skill}.png','frames':8,'w':96,'h':96,'fps':16,'scale':1.15 if kind in ('slash','impact') else 1.42, 'anchor':[.5,.65], 'at':'caster' if kind=='buff' else 'target', 'blend':'lighter'}
(FX/'manifest.js').write_text("'use strict';\n// Custom original, hand-coded pixel animation sheets, inspired by classic 2D MMORPG visual effects.\nconst fxSheets = "+json.dumps(manifest,ensure_ascii=False,indent=2)+";\n")
print(f'Generated {len(icons)} unique item PNGs, 3 new boss sprite sheets, {len(manifest)} skill sheets.')
