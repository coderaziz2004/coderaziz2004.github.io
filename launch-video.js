(()=>{
const dialog=document.createElement('dialog');dialog.className='launch-video-dialog';dialog.setAttribute('aria-label','Degla launch video');
dialog.innerHTML='<div class="launch-video-top"><span>DEGLA / LAUNCH FILM</span><button type="button" class="launch-video-close" aria-label="Close launch video">Close ×</button></div><video class="launch-video-player" controls playsinline preload="none" aria-label="Degla launch film"></video><p class="launch-video-status" role="status" hidden>Unable to load the film. Please try again.</p>';
document.body.append(dialog);const video=dialog.querySelector('video'),close=dialog.querySelector('button'),status=dialog.querySelector('[role="status"]');let trigger,oldOverflow='',hadFullscreen=false,closing=false;
function finish(){video.pause();document.body.style.overflow=oldOverflow;hadFullscreen=false;trigger?.focus();}
function dismiss(){if(closing)return;closing=true;video.pause();if(document.fullscreenElement===dialog)document.exitFullscreen().catch(()=>{});if(dialog.open)dialog.close();closing=false;}
dialog.addEventListener('close',finish);close.addEventListener('click',dismiss);dialog.addEventListener('cancel',event=>{event.preventDefault();dismiss()});
document.addEventListener('fullscreenchange',()=>{if(document.fullscreenElement===dialog)hadFullscreen=true;else if(hadFullscreen&&dialog.open)dismiss()});
video.addEventListener('error',()=>{status.hidden=false});
document.querySelectorAll('[data-launch-video]').forEach(button=>button.addEventListener('click',()=>{
trigger=button;document.querySelectorAll('video').forEach(v=>{if(v!==video&&!v.paused)v.pause()});oldOverflow=document.body.style.overflow;document.body.style.overflow='hidden';status.hidden=true;
if(!video.getAttribute('src'))video.src='https://investors.degla.ai/assets/degla-launch-20261116.mp4';
dialog.showModal();close.focus();if(dialog.requestFullscreen)dialog.requestFullscreen().catch(()=>{});video.play().catch(()=>{});
}));
})();