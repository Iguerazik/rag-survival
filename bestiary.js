'use strict';
function openBestiary(){
  const dialog=document.getElementById('bestiary-dialog');
  if(run && mode==='play'){run.bestiaryPreviousMode='play';mode='catalogue';}else if(run)run.bestiaryPreviousMode=mode;
  const list=document.getElementById('bestiary-list');list.replaceChildren();
  for(const [id,mob] of Object.entries(monsters)){
    const card=document.createElement('article');card.className='bestiary-monster';
    const img=document.createElement('img');img.src='assets/monsters/'+id+'.gif';img.alt=mob.name||id;img.loading='lazy';
    const copy=document.createElement('div'),title=document.createElement('strong');title.textContent=mob.name||({poring:'Poring',lunatic:'Lunático',fabre:'Fabre',spore:'Esporo'}[id]||id);
    const prop=document.createElement('p');prop.textContent=Elemental.info(id)+(bosses[id]?' · MVP':'');
    const weak=document.createElement('p');weak.textContent='Fraqueza: '+Elemental.weakness(id);
    copy.append(title,prop,weak);card.append(img,copy);list.append(card);
  }
  if(!dialog.open)dialog.showModal();
}
document.getElementById('bestiary-close').onclick=()=>document.getElementById('bestiary-dialog').close();
document.getElementById('bestiary-dialog').addEventListener('close',()=>{if(run && run.bestiaryPreviousMode==='play' && mode==='catalogue'){mode='play';canvas.focus({preventScroll:true});}});
document.getElementById('nav-bestiary').onclick=openBestiary;
