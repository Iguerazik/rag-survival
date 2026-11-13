/* V20: in-page guide, no download required; dedicated visible lobby. */
(() => {
 const dialog=document.getElementById('online-help-dialog');
 const open=()=>{if(!dialog.open)dialog.showModal();};
 for(const id of ['online-help-open','online-hub-help'])document.getElementById(id)?.addEventListener('click',open);
 document.getElementById('online-help-close')?.addEventListener('click',()=>dialog.close());
 dialog.addEventListener('click',e=>{if(e.target===dialog)dialog.close();});
 document.getElementById('online-help-to-lobby')?.addEventListener('click',()=>{
  dialog.close();document.getElementById('coop-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
 });
 document.getElementById('online-hub-focus')?.addEventListener('click',()=>{
  document.getElementById('coop-panel')?.scrollIntoView({behavior:'smooth',block:'center'});
 });
})();
