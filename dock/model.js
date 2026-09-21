(function(){
const T=THREE;
function material(color,metalness=.1,roughness=.4){return new T.MeshStandardMaterial({color,metalness,roughness});}
const white=material(0xe1e6e4,.16,.3),carbon=material(0x151c1b,.3,.36),silver=material(0x87918f,.72,.38),yellow=material(0xb6a14e,.28,.42),black=material(0x101714,.12,.5),steel=material(0x8d9998,.88,.2),rubber=material(0x0c100e,0,.9),glass=material(0x172a30,.78,.13);
function add(parent,geometry,mat,x=0,y=0,z=0){const mesh=new T.Mesh(geometry,mat);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function box(p,w,h,d,m,x=0,y=0,z=0){return add(p,new T.BoxGeometry(w,h,d),m,x,y,z);}
function rod(p,a,b,r,mat){const from=new T.Vector3(...a),to=new T.Vector3(...b),v=to.clone().sub(from);const mesh=add(p,new T.CylinderGeometry(r,r,v.length(),12),mat);mesh.position.copy(from).add(to).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),v.normalize());return mesh;}
// Tapered solid airfoil, in the same fixed-wing / lift-boom layout as the prototype.
function wing(parent,span,root,tip,z,y){const vertices=[],indices=[];const stations=[[-span/2,.24,tip,.028],[-.55,0,root,.075],[.55,0,root,.075],[span/2,.24,tip,.028]];stations.forEach(([x,sweep,chord,thick])=>{vertices.push(x,y,z+sweep-chord/2,x,y+thick,z+sweep,x,y,z+sweep+chord/2,x,y-thick*.45,z+sweep);});for(let i=0;i<3;i++)for(let j=0;j<4;j++){const a=i*4+j,b=i*4+(j+1)%4,c=(i+1)*4+j,d=(i+1)*4+(j+1)%4;indices.push(a,b,c,b,d,c);}indices.push(0,2,1,0,3,2,12,13,14,12,14,15);const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.setIndex(indices);geo.computeVertexNormals();return add(parent,geo,white);}
function makeAircraft(){const g=new T.Group(),rotors=[];
const profile=[new T.Vector2(0,-1.55),new T.Vector2(.13,-1.42),new T.Vector2(.26,-.95),new T.Vector2(.4,-.25),new T.Vector2(.43,.45),new T.Vector2(.35,1.1),new T.Vector2(.16,1.65),new T.Vector2(0,1.95)];const body=add(g,new T.LatheGeometry(profile,64),white);body.rotation.x=-Math.PI/2;body.scale.y=.78;body.scale.z=1;
wing(g,6.8,1.38,.58,-.32,.17);
const hatch=box(g,.34,.06,1.12,carbon,0,.32,-.42);box(g,.29,.015,.18,steel,0,.36,-.81);
[-1,1].forEach(side=>{rod(g,[side*1.35,-.12,-1.5],[side*1.35,-.12,2.6],.06,carbon);rod(g,[side*.2,-.15,-.5],[side*1.35,-.12,-.65],.055,carbon);});
// Raised, swept inverted-V tail from the workshop reference, on carbon booms.
const tailMat=material(0xb9c2c1,.22,.39);tailMat.side=T.DoubleSide;
[-1,1].forEach(side=>{const positions=[side*1.35,-.1,2.63,side*1.35,-.1,1.85,side*.48,1.02,1.58,side*.48,1.02,2.18];const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(positions,3));geo.setIndex(side>0?[0,1,2,0,2,3]:[0,2,1,0,3,2]);geo.computeVertexNormals();add(g,geo,tailMat);rod(g,[side*1.35,-.1,1.85],[side*.48,1.02,1.58],.047,carbon);});box(g,1.04,.085,.59,carbon,0,1.03,1.87);
[[-1.35,-1.35],[1.35,-1.35],[-1.35,1.3],[1.35,1.3]].forEach(([x,z])=>{add(g,new T.CylinderGeometry(.11,.12,.18,20),steel,x,.03,z);const rotor=new T.Group();rotor.position.set(x,.155,z);g.add(rotor);const blade=box(rotor,1.15,.019,.07,carbon);blade.rotation.y=.25;add(rotor,new T.CylinderGeometry(.06,.065,.075,12),black);const disc=add(rotor,new T.CircleGeometry(.56,40),new T.MeshBasicMaterial({color:0x9aa7a2,transparent:true,opacity:0,side:T.DoubleSide,depthWrite:false}),0,.02,0);disc.rotation.x=-Math.PI/2;rotor.userData.disc=disc;rotors.push(rotor);});
const pusher=new T.Group();pusher.position.set(0,.13,1.57);box(pusher,.07,1.2,.022,material(0x284f79,.18,.4));add(pusher,new T.SphereGeometry(.07,12,12),black);g.add(pusher);
const cam=add(g,new T.SphereGeometry(.15,20,16),black,0,-.31,-1.05);const lens=add(g,new T.CylinderGeometry(.065,.065,.07,20),glass,0,-.34,-1.18);lens.rotation.x=Math.PI/2;
[-1,1].forEach(side=>{rod(g,[side*.47,-.12,-.45],[side*.52,-.51,-.36],.028,carbon);rod(g,[side*.47,-.12,.5],[side*.52,-.51,.55],.028,carbon);rod(g,[side*.52,-.51,-.57],[side*.52,-.51,.8],.033,rubber);});
const lightMat=new T.MeshBasicMaterial({color:0xbee79a});[-1,1].forEach(side=>add(g,new T.SphereGeometry(.034,10,10),lightMat,side*3.3,.13,.3));g.userData={rotors,pusher};return g;}
// Two complementary shells meet at one ridge. There is no wall at the center seam.
function roofHalf(side){const g=new T.Group();const half=4.22,depth=6.3,bottom=0,eave=1.24,ridge=1.94;
function panel(points,mat){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(points.flat(),3));geo.setIndex([0,1,2,0,2,3]);geo.computeVertexNormals();const m=mat.clone();m.side=T.DoubleSide;return add(g,geo,m);}
// Sloping roof and the outside wall; the inboard edge remains completely open.
panel([[0,ridge,-depth/2],[side*half,eave,-depth/2],[side*half,eave,depth/2],[0,ridge,depth/2]],yellow);
panel([[side*half,bottom,-depth/2],[side*half,eave,-depth/2],[side*half,eave,depth/2],[side*half,bottom,depth/2]],yellow);
// Exterior front/back end panels move away with their own roof half.
for(const z of [-depth/2,depth/2]){panel([[0,bottom,z],[side*half,bottom,z],[side*half,eave,z],[0,ridge,z]],yellow);rod(g,[0,ridge,z],[side*half,eave,z],.035,steel);rod(g,[side*half,bottom,z],[side*half,eave,z],.035,steel);}
for(const z of [-2.85,0,2.85])rod(g,[side*.12,ridge-.045,z],[side*(half-.06),eave-.045,z],.025,steel);
rod(g,[0,ridge,-depth/2],[0,ridge,depth/2],.025,rubber);
g.position.set(0,1.6,0);g.userData.side=side;g.userData.innerEdge=0;g.userData.outerEdge=side*half;return g;}
function makeDock(){const g=new T.Group();
box(g,8.4,1.25,6.2,silver,0,.77,0);box(g,8.48,.16,6.26,steel,0,1.43,0);box(g,8.13,.045,5.94,black,0,1.53,0);box(g,7.5,.02,5.55,material(0x505c56,.45,.5),0,1.57,0);
// Separate metal cabinet doors, panel seams, handles and service connections.
for(let i=0;i<5;i++){const x=-3.33+i*1.66;box(g,1.61,1.07,.035,silver,x,.77,-3.12);box(g,.035,.21,.055,black,x+.63,.89,-3.152);for(const dx of [-.7,.7])for(const dy of [-.43,.43]){const screw=add(g,new T.CylinderGeometry(.018,.018,.014,8),steel,x+dx,.77+dy,-3.146);screw.rotation.x=Math.PI/2;}}
[-1,1].forEach(side=>{for(let j=0;j<9;j++)box(g,.026,.018,.7,black,side*4.211,.61+j*.038,.65);box(g,.033,.4,.56,black,side*4.215,1.05,-.95);const stop=add(g,new T.CylinderGeometry(.062,.062,.06,16),material(0xb13a26,.1,.4),side*4.25,1.08,-1.4);stop.rotation.z=Math.PI/2;});
for(const x of [-3.4,0,3.4])for(const z of [-1.65,1.65]){box(g,.62,.19,.5,carbon,x,.1,z);box(g,.5,.1,.4,steel,x,.235,z);}
[-1,1].forEach(side=>{box(g,18.2,.09,.11,steel,0,1.44,side*2.95);box(g,7.5,.012,.025,new T.MeshBasicMaterial({color:0xc2dcad}),0,1.593,side*2.6);});
// Charging guides align the landing skids without obscuring the aircraft.
for(const x of [-.52,.52])box(g,.14,.035,1.8,steel,x,1.6,0);
const roofs=[roofHalf(-1),roofHalf(1)];roofs.forEach(r=>g.add(r));g.userData.roofs=roofs;return g;}
window.DockModels={makeAircraft,makeDock};
})();
