(()=>{'use strict';
const root=document.documentElement,start=performance.now();let finished=false,deadline;
root.classList.add('mission-loading');
function finish(){if(finished)return;finished=true;clearTimeout(deadline);const loader=document.getElementById('mission-loader'),main=document.querySelector('main');if(main)main.inert=false;const active=loader&&loader.contains(document.activeElement);if(loader){loader.classList.add('is-leaving');const bar=document.getElementById('arrival-progress');if(bar)bar.style.width='100%';}setTimeout(()=>{root.classList.remove('mission-loading');if(loader)loader.remove();if(active)document.querySelector('.demo-footage-link')?.focus();},matchMedia('(prefers-reduced-motion: reduce)').matches?0:550);}
deadline=setTimeout(finish,8000);
function imageReady(src){return new Promise(resolve=>{const image=new Image();image.onload=()=>{if(image.decode)image.decode().catch(()=>{}).then(resolve);else resolve();};image.onerror=resolve;image.src=src;});}
document.addEventListener('DOMContentLoaded',()=>{
 const main=document.querySelector('main');if(main&&!finished)main.inert=true;
 document.getElementById('arrival-skip')?.addEventListener('click',finish);
 if(finished){document.getElementById('mission-loader')?.remove();return;}
 const jobs=[imageReady('assets/opening-4608.jpg'),imageReady('assets/rescue-girl-v2.png'),imageReady('assets/border-poster.jpg'),document.fonts?document.fonts.ready:Promise.resolve()];let done=0;
 jobs.forEach(job=>job.then(()=>{done++;const bar=document.getElementById('arrival-progress');if(bar)bar.style.width=Math.round(done/jobs.length*100)+'%';}));
 Promise.allSettled(jobs).then(()=>{const label=document.getElementById('arrival-status');if(label)label.textContent='Mission ready.';setTimeout(()=>requestAnimationFrame(()=>requestAnimationFrame(finish)),Math.max(0,1000-(performance.now()-start)));});
},{once:true});
})();
