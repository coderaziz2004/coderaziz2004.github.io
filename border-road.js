// One terrain surface for the road, shoulders and wheel contacts.
(()=>{const T=THREE,smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t)};
const center=z=>30+18*Math.sin(z*.012);
const natural=(x,z)=>Math.sin(x*.018)*Math.cos(z*.015)*3+Math.max(0,(Math.abs(x)-130)/250)*28+Math.sin(x*.064)*Math.cos(z*.04)*.6+WorldEnvironment.relief(x,z);
function bed(z){return (natural(center(z-6),z-6)+2*natural(center(z),z)+natural(center(z+6),z+6))/4;}
function height(x,z){const d=Math.abs(x-center(z)),blend=1-smooth((d-3.5)/3.0);return natural(x,z)*(1-blend)+(bed(z)+.035*Math.max(0,1-d/3.5))*blend;}
function paint(ground){const previous=ground.material.onBeforeCompile;ground.material.onBeforeCompile=shader=>{previous(shader);shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`// Graded road is painted directly onto the terrain: no floating ribbon.
float roadCenter=30.+18.*sin(terrainXZ.y*.012);
float roadD=abs(terrainXZ.x-roadCenter);
float roadEdge=.10*sin(terrainXZ.y*.8)+.07*sin(terrainXZ.y*2.1);
float roadMask=1.-smoothstep(3.05+roadEdge,3.85+roadEdge,roadD);
float rut=exp(-pow((roadD-1.025)/.22,2.));
float grit=terrainNoise(terrainXZ*4.);
vec3 dirt=vec3(.43,.365,.275)*(.94+.12*grit-rut*.16);
diffuseColor.rgb=mix(diffuseColor.rgb,dirt,roadMask*.88);
#include <roughnessmap_fragment>`);};ground.material.needsUpdate=true;}
function sampler(ground){const geo=ground.geometry,p=geo.attributes.position,n=geo.parameters.widthSegments,size=geo.parameters.width,half=size/2,step=size/n;return (x,z)=>{const gx=Math.max(0,Math.min(n-.000001,(x+half)/step)),gz=Math.max(0,Math.min(n-.000001,(z+half)/step)),ix=Math.floor(gx),iz=Math.floor(gz),u=gx-ix,v=gz-iz,k=iz*(n+1)+ix,a=p.getZ(k),b=p.getZ(k+1),c=p.getZ(k+n+1),d=p.getZ(k+n+2);return u+v<=1?a*(1-u-v)+b*u+c*v:d*(u+v-1)+b*(1-v)+c*(1-u);};}
function pose(car,sample,z){const x=center(z),front=new T.Vector3(center(z-1.7),sample(center(z-1.7),z-1.7),z-1.7),rear=new T.Vector3(center(z+1.65),sample(center(z+1.65),z+1.65),z+1.65),forward=front.sub(rear).normalize();let right=new T.Vector3(forward.z,0,-forward.x).normalize();const leftY=sample(x-right.x*1.025,z-right.z*1.025),rightY=sample(x+right.x*1.025,z+right.z*1.025);right.y=(rightY-leftY)/2.05;right.normalize();const up=new T.Vector3().crossVectors(forward,right).normalize();right.crossVectors(up,forward).normalize();car.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(right,up,forward));
// Average the actual triangulated road at the four tyres, including body pitch and roll.
let sum=0;for(const side of [-1,1])for(const axle of [-1.65,1.7]){const local=new T.Vector3(side*1.025,.02,axle).applyQuaternion(car.quaternion);sum+=sample(x+local.x,z+local.z)-local.y;}car.position.set(x,sum/4+.008,z);for(const wheel of car.userData.wheels||[]){const contact=new T.Vector3(wheel.position.x,.02,wheel.position.z).applyQuaternion(car.quaternion).add(car.position);const suspension=(sample(contact.x,contact.z)-contact.y)/up.y;wheel.position.y=.48+suspension;}}
window.BorderRoad={center,height,paint,sampler,pose};})();
