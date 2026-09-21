/* Synchronized RGB / LWIR pursuit simulation using generated photographic assets. */
(function(){
  const canvas=document.getElementById('vehicle-camera');
  const ctx=canvas.getContext('2d');
  const frames={};
  let last={time:0,feed:'rgb',speed:12};
  ['road-rgb','road-thermal','car-rgb','car-thermal'].forEach(name=>{const image=new Image();frames[name]=image;image.onload=()=>draw(last.time,last.feed,last.speed);image.src='assets/vehicle-'+name+'.png';});
  function loaded(img){return img&&img.complete&&img.naturalWidth>0;}
  function draw(time,feed,speed){last={time,feed,speed};if(!ctx)return;const thermal=feed==='thermal',road=frames['road-'+feed],car=frames['car-'+feed];const W=canvas.width,H=canvas.height;ctx.clearRect(0,0,W,H);ctx.fillStyle=thermal?'#202020':'#343a2a';ctx.fillRect(0,0,W,H);
    if(!loaded(road)||!loaded(car)){ctx.fillStyle='#d0dfc3';ctx.font='18px monospace';ctx.fillText('ACQUIRING SENSOR VIEW…',170,180);return;}
    const roadWidth=W*1.12,tileHeight=road.naturalHeight*roadWidth/road.naturalWidth;
    const distance=(12*time+(2/.24)*(1-Math.cos(time*.24)))*5;
    const laneOffset=Math.sin(time*.19)*8,roll=Math.sin(time*.15)*.018;
    ctx.save();ctx.translate(W/2+laneOffset,H/2);ctx.rotate(roll);
    const offset=distance%(tileHeight*2);
    for(let n=-3;n<=2;n++){ctx.save();ctx.translate(-roadWidth/2,n*tileHeight+offset-H/2);if(Math.abs(n)%2){ctx.translate(0,tileHeight);ctx.scale(1,-1);}ctx.drawImage(road,0,0,roadWidth,tileHeight+1);ctx.restore();}
    ctx.restore();
    const x=W/2+Math.sin(time*.43)*7,y=H*.48+Math.sin(time*.27)*5;
    const carHeight=85,carWidth=carHeight*625/1265;
    ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(time*.35)*.025);ctx.drawImage(car,200,140,625,1265,-carWidth/2,-carHeight/2,carWidth,carHeight);ctx.restore();
    // The target box follows the vehicle, while the terrain moves under the gimbal.
    const boxW=55,boxH=83,left=x-boxW/2,top=y-boxH/2,c=10;
    ctx.strokeStyle=thermal?'#ffffff':'#c4f79c';ctx.lineWidth=1.5;ctx.beginPath();
    [[left,top,1,1],[left+boxW,top,-1,1],[left,top+boxH,1,-1],[left+boxW,top+boxH,-1,-1]].forEach(([a,b,dx,dy])=>{ctx.moveTo(a+c*dx,b);ctx.lineTo(a,b);ctx.lineTo(a,b+c*dy);});ctx.stroke();
    ctx.font='12px monospace';ctx.fillStyle=thermal?'#fff':'#d7fac2';ctx.fillText('VEHICLE–01',left-8,top-12);
    ctx.strokeStyle='#ffffff13';ctx.lineWidth=1;ctx.beginPath();for(let y=0;y<H;y+=4){ctx.moveTo(0,y);ctx.lineTo(W,y);}ctx.stroke();
    ctx.fillStyle='#ffffffb0';ctx.font='11px monospace';const seconds=Math.floor(time);ctx.fillText('T+'+String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0')+'  GIMBAL LOCK',W-172,H-17);
  }
  window.VehicleCamera={draw};
})();
