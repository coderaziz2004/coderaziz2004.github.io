(function(){
const T=THREE,root=document.getElementById('scene'),poster=document.getElementById('poster');
const DURATION=34,LAND=2.14,FLIGHT=6.6;
const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);};
// One continuous physical sequence: open, lift, depart, align, descend, close.
function stateAt(t){let open=0,lift=0,travel=0,spin=0,stage=0,label='Ready for the next mission.';
 if(t>=2&&t<5){open=ease((t-2)/3);label='Hangar opening.';}
 else if(t>=5&&t<7){open=1;spin=ease((t-5)/2);label='Preflight complete. Rotors starting.';stage=1;}
 else if(t>=7&&t<12){open=1;spin=1;lift=ease((t-7)/5);label='Vertical takeoff.';stage=1;}
 else if(t>=12&&t<17){open=1;spin=1;lift=1;travel=ease((t-12)/5);label='Clear of the dock. On mission.';stage=1;}
 else if(t>=17&&t<22){open=1;spin=1;lift=1;travel=1-ease((t-17)/5);label='Returning. Aligning with the dock.';stage=2;}
 else if(t>=22&&t<27){open=1;spin=1;lift=1-ease((t-22)/5);label='Precision descent. Landing.';stage=3;}
 else if(t>=27&&t<29){open=1;spin=1-ease((t-27)/2);label='Landed. Rotors shutting down.';stage=3;}
 else if(t>=29&&t<32){open=1-ease((t-29)/3);label='Hangar closing.';stage=4;}
 else if(t>=32){label='Aircraft secured. Ready again.';stage=4;}
 return {open,spin,lift,travel,stage,label,x:travel*1.7,y:LAND+(FLIGHT-LAND)*lift,z:-travel*3.7};}
window.DockTimeline={stateAt,duration:DURATION};
let renderer;try{renderer=new T.WebGLRenderer({antialias:true,alpha:false,powerPreference:'low-power'});}catch(e){document.getElementById('fallback').hidden=false;document.getElementById('play').disabled=true;document.getElementById('replay').disabled=true;document.getElementById('scrub').disabled=true;return;}
renderer.setPixelRatio(Math.min(devicePixelRatio,1.75));renderer.outputEncoding=T.sRGBEncoding;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.16;renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;root.appendChild(renderer.domElement);
const scene=new T.Scene();scene.background=new T.Color(0x151918);scene.fog=new T.Fog(0x151918,28,65);
const camera=new T.PerspectiveCamera(38,1,.1,100);camera.position.set(13,9,-16);
const controls=new T.OrbitControls(camera,renderer.domElement);controls.target.set(0,2.8,0);controls.enableDamping=true;controls.enableZoom=false;controls.enablePan=false;controls.minPolarAngle=.45;controls.maxPolarAngle=1.28;controls.autoRotate=false;
scene.add(new T.HemisphereLight(0xdde8ec,0x252b20,1.25));scene.add(new T.AmbientLight(0xffffff,.25));
const key=new T.DirectionalLight(0xfff0d5,3);key.position.set(-7,14,-8);key.castShadow=true;key.shadow.mapSize.set(2048,2048);Object.assign(key.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:.1,far:40});key.shadow.bias=-.0003;key.shadow.normalBias=.02;key.shadow.radius=4;scene.add(key);
const fill=new T.DirectionalLight(0xcbdff3,1.2);fill.position.set(8,7,4);scene.add(fill);const rim=new T.DirectionalLight(0xffffff,1.6);rim.position.set(-2,5,10);scene.add(rim);
// Large luminous studio panels create real metal reflections without external assets.
const env=new T.Scene();env.background=new T.Color(0x525a5e);
[[0,9,0,14,10,4],[8,3,-2,8,5,2],[-8,4,-3,8,6,3],[0,3,10,12,5,2]].forEach(([x,y,z,w,h,power])=>{const panel=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshBasicMaterial({color:new T.Color(power,power,power),side:T.DoubleSide}));panel.position.set(x,y,z);panel.lookAt(0,2,0);env.add(panel);});
const pmrem=new T.PMREMGenerator(renderer);const envMap=pmrem.fromScene(env,.06);scene.environment=envMap.texture;pmrem.dispose();
const floor=new T.Mesh(new T.PlaneGeometry(160,160),new T.MeshStandardMaterial({color:0x242a27,roughness:.72,metalness:.15}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
const dock=window.DockModels.makeDock(),aircraft=window.DockModels.makeAircraft();scene.add(dock,aircraft);
const phaseLabel=document.getElementById('phase'),play=document.getElementById('play'),replay=document.getElementById('replay'),scrub=document.getElementById('scrub');
let time=0,paused=matchMedia('(prefers-reduced-motion: reduce)').matches,visible=true,last=null,lastStage=-1,lastLabel='',rendered=false;
function button(){play.textContent=paused?'▶ Play':'Ⅱ Pause';play.setAttribute('aria-label',paused?'Play docking animation':'Pause docking animation');}
play.addEventListener('click',()=>{paused=!paused;button();});replay.addEventListener('click',()=>{time=0;paused=false;button();});scrub.addEventListener('input',()=>{time=Number(scrub.value);paused=true;button();});button();
window.addEventListener('message',e=>{if(e.source!==parent||e.origin!==location.origin||e.data?.type!=='degla-dock')return;visible=Boolean(e.data.active);last=null;});
function resize(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<650?49:38;camera.updateProjectionMatrix();}addEventListener('resize',resize);resize();
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();root.hidden=true;poster.hidden=false;document.getElementById('fallback').hidden=false;paused=true;button();});
function frame(stamp){requestAnimationFrame(frame);const dt=last===null?0:Math.min((stamp-last)/1000,.05);last=stamp;if(!visible||document.hidden)return;if(!paused)time=(time+dt)%DURATION;const s=stateAt(time);
 dock.userData.roofs.forEach(roof=>{roof.position.x=roof.userData.side*(s.open*4.65);});aircraft.position.set(s.x,s.y,s.z);aircraft.rotation.z=-Math.sin(s.travel*Math.PI)*.045;aircraft.rotation.x=s.travel*.028;
 aircraft.userData.rotors.forEach((rotor,i)=>{if(!paused)rotor.rotation.y+=dt*s.spin*70*(i%2?1:-1);rotor.userData.disc.material.opacity=s.spin*.17;});if(!paused)aircraft.userData.pusher.rotation.z+=dt*s.spin*s.travel*75;
 if(lastLabel!==s.label){phaseLabel.textContent=s.label;lastLabel=s.label;}if(lastStage!==s.stage){document.querySelectorAll('[data-step]').forEach(el=>el.classList.toggle('active',Number(el.dataset.step)===s.stage));lastStage=s.stage;}scrub.value=time.toFixed(2);scrub.setAttribute('aria-valuetext',s.label);
 controls.update();renderer.render(scene,camera);if(!rendered){poster.hidden=true;rendered=true;}}
requestAnimationFrame(frame);
})();
