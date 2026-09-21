/* Orbit and zoom the generated, registered camera frames around the locked subject. */
(function(){
  const canvas=document.getElementById('rescue-camera'),ctx=canvas.getContext('2d');
  const frames={rgb:document.getElementById('sensor-rgb'),thermal:document.getElementById('sensor-thermal')};
  let lastAngle=0,lastFeed='rgb';
  function draw(angle,feed){lastAngle=angle;lastFeed=feed;const photo=frames[feed],W=canvas.width,H=canvas.height;
    const zoom=1.015+.075*(.5-.5*Math.cos(angle*.85));
    if(!ctx)return zoom;
    ctx.fillStyle='#182015';ctx.fillRect(0,0,W,H);
    if(!photo.complete||!photo.naturalWidth){ctx.fillStyle='#d7eac9';ctx.font='17px monospace';ctx.fillText('ACQUIRING SUBJECT…',245,220);return zoom;}
    // A stabilized high-altitude gimbal gently changes bearing during the orbit.
    const rotation=-Math.sin(angle)*.18,cos=Math.abs(Math.cos(rotation)),sin=Math.abs(Math.sin(rotation));
    const scale=Math.max((W*cos+H*sin)/photo.naturalWidth,(W*sin+H*cos)/photo.naturalHeight)*zoom;
    const subjectX=photo.naturalWidth*.503,subjectY=photo.naturalHeight*.515;
    ctx.save();ctx.translate(W/2,H/2);ctx.rotate(rotation);ctx.scale(scale,scale);ctx.drawImage(photo,-subjectX,-subjectY);ctx.restore();
    // The gimbal lock box remains aligned to the changing image-space silhouette.
    const bw=photo.naturalWidth*.095*scale,bh=photo.naturalHeight*.34*scale;
    const boxW=bw*cos+bh*sin+14,boxH=bw*sin+bh*cos+14;
    const x=W/2-boxW/2,y=H/2-boxH/2,c=14;
    ctx.strokeStyle=feed==='thermal'?'#ffffff':'#d8f9b9';ctx.lineWidth=1.4;ctx.beginPath();
    [[x,y,1,1],[x+boxW,y,-1,1],[x,y+boxH,1,-1],[x+boxW,y+boxH,-1,-1]].forEach(([a,b,dx,dy])=>{ctx.moveTo(a+c*dx,b);ctx.lineTo(a,b);ctx.lineTo(a,b+c*dy);});ctx.stroke();
    ctx.fillStyle=feed==='thermal'?'#fff':'#e0f8c9';ctx.font='12px monospace';ctx.fillText('SUBJECT LOCKED',Math.max(12,x),Math.max(60,y-12));
    // An orbit indicator gives the camera motion the same reference as the map.
    const ox=W-37,oy=H-43;ctx.strokeStyle='#d8edc180';ctx.lineWidth=1;ctx.beginPath();ctx.arc(ox,oy,18,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#d8edc1';ctx.beginPath();ctx.arc(ox+18*Math.cos(angle),oy+18*Math.sin(angle),3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.arc(ox,oy,2,0,Math.PI*2);ctx.fill();return zoom;
  }
  Object.values(frames).forEach(frame=>frame.addEventListener('load',()=>draw(lastAngle,lastFeed)));
  window.RescueCamera={draw};
})();
