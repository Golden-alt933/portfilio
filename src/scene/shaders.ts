/** Standalone GLSL keeps render passes readable and makes the scene boundaries explicit. */
export const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const refractionVertex = `uniform float uDepthScale,uRipple,uTime; varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; void main(){ vUv=uv; vec3 p=position; float radius=length(p.xy); p.z*=uDepthScale; p.z+=sin(radius*5.-uTime*2.)*uRipple*.018; vec4 world=modelMatrix*vec4(p,1.0); vWorld=world.xyz; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*world; }`;

export const backgroundFragment = `precision highp float; varying vec2 vUv;
uniform float uTime,uLight,uContact,uReveal,uServices,uAspect,uPortalReveal,uPortalIsVideo,uPortalAspect,uWorks,uWorksY,uWorkMedia,uScroll;
uniform sampler2D uFluid,uInk,uPortalMedia,uWorksMap;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
// Three panel looks after the reference's pattern set: thresholded blue/lilac
// channel noise, high-contrast stripes from fract(n*9), and violet/cyan/orange.
// Domain-warped animated noise stands in for its 64x64 simplex texture.
vec3 panelPattern(float mode,vec2 p,float seed){
  float t=uTime*.1;
  vec2 q=p*2.4+seed*7.3;
  vec2 r=q+vec2(noise(q+vec2(t,0.)),noise(q*1.3-vec2(0.,t)+3.1))*1.5;
  float nx=noise(r*1.7+t), ny=noise(r*2.1-t*.8+5.), nz=noise(r*2.6+t*.6+9.), nw=noise(r*.8+t*.5+13.);
  if(mode<.5){
    vec3 c=vec3(.04,.06,.32)*step(.46,nx)+vec3(.36,.3,.7)*step(.64,ny)+vec3(.1,.16,.62)*step(.58,nz)*.6;
    return c;
  }
  if(mode<1.5){
    float s=step(.5,fract(nw*9.+nx*.4));
    return mix(vec3(.012,.012,.016),vec3(.66,.68,.72),s);
  }
  vec3 c=mix(vec3(.34,.12,.66),vec3(.04,.64,.74),smoothstep(.35,.7,nx));
  c=mix(c,vec3(.95,.44,.12),smoothstep(.6,.86,ny)*.85);
  return c*mix(.5,1.,nz);
}
vec3 coverMedia(vec2 uv){
  vec2 m=uv-.5;
  if(uPortalAspect>uAspect){ m.x*=uAspect/uPortalAspect; } else { m.y*=uPortalAspect/uAspect; }
  return texture2D(uPortalMedia,clamp(m+.5,vec2(.002),vec2(.998))).rgb;
}
void main(){
vec2 v=texture2D(uFluid,vUv).rg;
// Fluid velocity nudges the whole wall, as in the reference's scene mixer.
vec2 uv=vUv+v*.01;
// Curved wall: the viewer stands inside a cylinder of screens.
vec2 roomP=(uv-.5)*vec2(uAspect,1.)*1.55; float th=atan(roomP.x);
vec2 wall=vec2(th*.62,roomP.y*cos(th)*.62)+.5;
wall.y-=uScroll;
// Recursive quadtree panels. The panelLayout reshuffles every four seconds and
// panels shrink away around each swap.
float layoutT=uTime/4.; float panelLayout=floor(layoutT); float layoutPhase=fract(layoutT);
vec2 base=wall*vec2(7.,4.); vec2 id=floor(base); vec2 f=fract(base); float size=1.;
for(int i=0;i<3;i++){
  float h=hash(id*1.37+vec2(panelLayout*3.1,float(i)*7.7));
  if(h<(i==0?.3:.5)) break;
  vec2 q=step(.5,f); id=id*2.+q; f=fract(f*2.); size*=.5;
}
float rnd=hash(id+panelLayout*.37);
float hide=1.-smoothstep(0.,.07,layoutPhase)*smoothstep(1.,.93,layoutPhase);
float gap=.016/size+hide*.5*(.6+.4*rnd);
vec2 e=min(f,1.-f); float edgeDist=min(e.x,e.y);
float inPanel=smoothstep(gap,gap+.006/size,edgeDist);
// Asynchronous pattern changes, UV jumps and blackouts per panel.
float cycle=uTime/(2.+rnd*4.)+rnd*10.;
float mode=floor(hash(id+floor(cycle))*3.); float nextMode=floor(hash(id+floor(cycle)+1.)*3.);
float fade=smoothstep(.82,1.,fract(cycle));
float jt=uTime*(.2+rnd*.6)+rnd*7.; float jEpoch=floor(jt); float jPhase=fract(jt);
vec2 jump=(vec2(hash(id+jEpoch*1.3),hash(id-jEpoch*2.1))-.5)*.5*step(.55,hash(id+jEpoch+4.))*(1.-smoothstep(0.,.3,jPhase));
vec2 pUv=wall*vec2(1.6,1.)+jump*size;
vec3 pat=mix(panelPattern(mode,pUv,rnd),panelPattern(nextMode,pUv,rnd),fade);
float blackout=1.-step(.84,hash(id+floor(uTime*(.8+rnd))))*.92;
pat*=(.55+.45*rnd)*blackout*.42; pat=mix(pat,pat*vec3(.62,.82,1.25),.4);
// While the work track is up, the active project plays across the wall,
// softly blurred and split by the panels like a video wall.
if(uWorkMedia>.001){
  vec2 mo=vec2(.012,.012*uAspect);
  vec3 media=(coverMedia(uv)*2.+coverMedia(uv+mo)+coverMedia(uv-mo)+coverMedia(uv+vec2(mo.x,-mo.y))+coverMedia(uv-vec2(mo.x,-mo.y)))/6.;
  media=mix(media,sRGBTransferEOTF(vec4(media,1.)).rgb,uPortalIsVideo);
  pat=mix(pat,media*(.45+.35*rnd),uWorkMedia*.85);
}
// Fine dot texture and fluid-lit panel rims.
vec2 dotP=fract(gl_FragCoord.xy*.23); float dots=step(.35,dotP.x)*step(.35,dotP.y); pat*=.8+.2*dots;
float rim=(1.-smoothstep(gap,gap+.035/size,edgeDist))*inPanel;
pat+=vec3(.12,.22,.55)*rim*min(length(v)*2.5,1.)*.6;
vec3 col=mix(vec3(.004,.005,.009),pat,inPanel);
// Broad studio cast over the wall: blue from the right, teal from the left.
col+=(vec3(.0,.025,.15)*smoothstep(.2,1.05,uv.x)+vec3(.0,.055,.035)*smoothstep(.8,-.05,uv.x))*(1.-uServices)*(1.-uLight);
// WORKS is lettered across the wall and travels down it with scroll.
float worksAmount=abs(uWorks);
if(worksAmount>.001){
  vec2 wq=(wall-vec2(.5,.5-uScroll))*vec2(uAspect,1.);
  wq.y+=uWorksY;
  float wa=-.2; wq=mat2(cos(wa),-sin(wa),sin(wa),cos(wa))*wq;
  wq.x*=1.+wq.y*.42;
  float textW=uAspect*1.3;
  vec2 wuv=vec2(wq.x/textW+.5,wq.y/(textW/3.94)+.5);
  float inside=step(0.,wuv.x)*step(wuv.x,1.)*step(0.,wuv.y)*step(wuv.y,1.);
  float letters=texture2D(uWorksMap,clamp(wuv,vec2(.001),vec2(.999))).a*inside;
  col=mix(col,(vec3(.5,.54,.6)+pat*.6)*mix(.35,1.,inPanel),letters*worksAmount*.7);
}
// Curved 64x64 grid and cross marks on the same wall.
float grid=min(abs(fract(wall.x*64.)-.5),abs(fract(wall.y*64.)-.5)); float gridLine=1.-smoothstep(0.,.02,grid);
vec2 crossUv=abs(fract(wall*8.)-.5)*vec2(uAspect,1.);
float thinX=1.-smoothstep(.004,.012,crossUv.x),thinY=1.-smoothstep(.004,.012,crossUv.y);
float longX=1.-smoothstep(.028,.04,crossUv.x),longY=1.-smoothstep(.028,.04,crossUv.y);
float cross=max(thinX*longY,longX*thinY);
col+=vec3(.05,.06,.08)*(gridLine*.2+cross*.3);
col=mix(col,vec3(.012,.023,.024)+vec3(.15,.23,.22)*(gridLine*.23+cross*.65),uServices);
// Pigment glow from the fluid field.
vec3 pigment=texture2D(uInk,clamp(uv,vec2(.001),vec2(.999))).rgb;
vec3 halo=(texture2D(uInk,clamp(uv+vec2(.025,.014),vec2(.001),vec2(.999))).rgb+texture2D(uInk,clamp(uv-vec2(.025,.014),vec2(.001),vec2(.999))).rgb)*.5;
float wisps=.65+.35*noise(uv*85.+v*.4-uTime*.08);
vec3 inkGlow=(pigment*.5*wisps+halo*.1)*(1.-uServices*.8)*(1.-uLight);
float domeY=uv.y+pow(uv.x-.5,2.)*.55; float lightWipe=mix(smoothstep(domeY-.06,domeY+.06,uLight*1.14-.1)*step(.001,uLight),1.,smoothstep(.96,1.,uLight));
float indigoMix=smoothstep(.02,.26,uLight)*(1.-uServices); vec3 indigo=vec3(.035,.02,.5)+vec3(.05,.05,.24)*(gridLine*.5+cross*.9)+pat*.3*inPanel; col=mix(col,indigo,indigoMix);
vec3 lightCol=vec3(.843,.859,.863); col=mix(col,lightCol,lightWipe); col=mix(col,vec3(.45,.48,.49),clamp(lightWipe*(gridLine*.045+cross*.2),0.,.3));
float vignette=1.-smoothstep(.2,.85,length((uv-.5)*vec2(.9,1.))); col*=mix(mix(.45,1.,vignette),1.,uLight); col*=1.+min(length(v),1.)*.8*(1.-uLight);
col=mix(col,vec3(.006,.008,.012),uContact*.98); col+=vec3(.0,.03,.036)*(1.-smoothstep(0.,.75,length((uv-.5)*vec2(1.,1.7))))*uContact;
col=sRGBTransferEOTF(vec4(max(col,vec3(0.)),1.)).rgb;
col+=inkGlow;
vec3 portal=coverMedia(vUv);
portal=mix(portal,sRGBTransferEOTF(vec4(portal,1.)).rgb,uPortalIsVideo);
col=mix(col,portal*.18,clamp(uPortalReveal,0.,1.)*.35);
gl_FragColor=vec4(col,1.); }`;

export const refractionFragment = `precision highp float; varying vec2 vUv; varying vec3 vNormal,vWorld; uniform sampler2D uScene,uFluid,uInk; uniform samplerCube uEnv; uniform vec2 uResolution; uniform vec3 uIorRGB; uniform float uTime,uLight,uReveal,uServices,uContact,uRoughness,uNoiseScale,uRipple; uniform vec3 uTint;
float surfaceNoise(vec3 p){ return sin(p.x*uNoiseScale+sin(p.y*uNoiseScale*.63)+uTime*.2)*sin(p.y*uNoiseScale*.81+p.z*4.); }
void main(){ vec3 baseN=normalize(vNormal); vec3 N=normalize(baseN+vec3(surfaceNoise(vWorld)*.035, surfaceNoise(vWorld.yzx+3.)*.035,0.)); vec3 V=normalize(cameraPosition-vWorld); vec2 screen=gl_FragCoord.xy/uResolution; vec2 vel=texture2D(uFluid,screen).rg;
vec2 radial=(screen-.5)*vec2(uResolution.x/uResolution.y,1.); float rr=length(radial); float revealFront=uReveal*1.25; float rippleRing=exp(-pow((rr-revealFront)*19.,2.)); vec2 rippleDir=radial/max(rr,.001); vec2 fullLens=rippleDir*sin((rr-revealFront)*82.-uTime*5.2)*rippleRing*uRipple*.038; screen=clamp(screen+fullLens,vec2(.002),vec2(.998));
vec2 bend=N.xy*.09+vec2(surfaceNoise(vWorld),surfaceNoise(vWorld.yzx+5.))*.006+vel*.004; vec2 roughDir=normalize(N.xy+vec2(.0001)); float blur=uRoughness*(.004+abs(surfaceNoise(vWorld))*.006); vec2 d=roughDir*blur; vec3 a=texture2D(uScene,clamp(screen+bend+d,vec2(.002),vec2(.998))).rgb; vec3 b=texture2D(uScene,clamp(screen+bend-d,vec2(.002),vec2(.998))).rgb; vec3 c=texture2D(uScene,clamp(screen+bend+d.yx,vec2(.002),vec2(.998))).rgb; vec3 e=texture2D(uScene,clamp(screen+bend-d.yx,vec2(.002),vec2(.998))).rgb;
vec3 f=texture2D(uScene,clamp(screen+bend+d*1.7,vec2(.002),vec2(.998))).rgb; vec3 g=texture2D(uScene,clamp(screen+bend-d*1.7,vec2(.002),vec2(.998))).rgb; vec3 h=texture2D(uScene,clamp(screen+bend+d.yx*1.7,vec2(.002),vec2(.998))).rgb; vec3 i=texture2D(uScene,clamp(screen+bend-d.yx*1.7,vec2(.002),vec2(.998))).rgb;
vec3 softened=(a+b+c+e+f+g+h+i)*.125; vec3 rayR=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.r); vec3 rayG=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.g); vec3 rayB=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.b);
vec2 offsetR=rayR.xy/max(.2,abs(rayR.z))*.11; vec2 offsetG=rayG.xy/max(.2,abs(rayG.z))*.11; vec2 offsetB=rayB.xy/max(.2,abs(rayB.z))*.11;
vec3 dispersed=vec3(texture2D(uScene,clamp(screen+offsetR+vel*.004,vec2(.002),vec2(.998))).r,texture2D(uScene,clamp(screen+offsetG+vel*.004,vec2(.002),vec2(.998))).g,texture2D(uScene,clamp(screen+offsetB+vel*.004,vec2(.002),vec2(.998))).b); vec3 refr=mix(dispersed,softened,clamp(uRoughness*3.,0.,.8));
vec3 reflected=textureCube(uEnv,reflect(-V,N)).rgb; float bands=pow(max(0.,dot(N,normalize(vec3(.05,.56,.83)))),4.)*.95+pow(max(0.,dot(N,normalize(vec3(-.72,.2,.66)))),10.)*.7; float bevelLight=pow(max(0.,dot(N,normalize(vec3(.45,-.25,.86)))),22.)*.85;
float grain=surfaceNoise(vWorld)*.018; float fresnel=pow(1.-max(dot(N,V),0.),5.); vec3 studio=max(reflected,vec3(.13,.19,.3)); vec3 ink=texture2D(uInk,clamp(screen+bend*.5,vec2(.002),vec2(.998))).rgb;
vec3 color=refr*.98+studio*(.07+fresnel*.55)+vec3(.48,.63,.91)*bands*.43+vec3(.72,.85,1.)*bevelLight*.7+grain+ink*(.12+fresnel*.16);
float contour=step(.58,fract((vUv.x+vUv.y)*42.)); vec3 light=vec3(.17,.78,.73); color=mix(color,light,.38*uLight*contour); color=mix(color,vec3(.84,.98,.95),uLight*.14); color*=1.+min(length(vel),1.)*.12; color*=mix(vec3(1.),uTint,1.-uLight); gl_FragColor=vec4(color,(1.-uLight*.99)*(1.-uServices*.82)*(1.-uContact)*smoothstep(0.,.45,uReveal)); }`;

export const displayFragment = `precision highp float; varying vec2 vUv; uniform float uOpacity,uTime;
void main(){
float hue=vUv.y*.8+vUv.x*.13+sin(vUv.y*7.+uTime*.3)*.06+uTime*.025;
vec3 c=.52+.48*cos(6.2831853*(hue+vec3(0.,.33,.67)));
c=mix(c,vec3(1.),pow(abs(sin(vUv.y*13.+uTime*.4)),18.)*.2);
float grid=step(.96,fract(vUv.x*10.))*.1+step(.96,fract(vUv.y*48.))*.1;
c+=vec3(grid); c=sRGBTransferEOTF(vec4(clamp(c,0.,1.),1.)).rgb;
gl_FragColor=vec4(c,uOpacity*.85);
}`;

export const panelVertex = fullscreenVertex;

export const panelFragment = `precision highp float; varying vec2 vUv; uniform sampler2D uMap,uMedia; uniform float uOpacity,uMediaMix,uMediaIsVideo,uMediaAspect,uMapAspect,uFrameAspect,uDim;
vec2 coverUv(vec2 uv,float aspect){ vec2 p=uv-.5; if(aspect>uFrameAspect){p.x*=uFrameAspect/aspect;} else {p.y*=aspect/uFrameAspect;} return clamp(p+.5,vec2(.002),vec2(.998)); }
void main(){vec2 p=(vUv-.5)*2.; float r=dot(p,p); vec2 uv=vUv+p*r*.012; vec2 d=normalize(p+vec2(.0001))*.0015; vec4 a=texture2D(uMap,coverUv(uv+d,uMapAspect)); vec4 b=texture2D(uMap,coverUv(uv-d,uMapAspect)); vec4 c=texture2D(uMap,coverUv(uv+d.yx,uMapAspect)); vec4 e=texture2D(uMap,coverUv(uv-d.yx,uMapAspect)); vec3 col=(a.rgb+b.rgb+c.rgb+e.rgb)*.17+vec3(a.r,b.g,c.b)*.32; vec3 media=texture2D(uMedia,coverUv(uv,uMediaAspect)).rgb; media=mix(media,sRGBTransferEOTF(vec4(media,1.)).rgb,uMediaIsVideo); col=mix(col,media,clamp(uMediaMix,0.,1.)); float edge=1.-smoothstep(.72,1.12,length(p)); col*=mix(.82,1.,edge)*uDim; vec2 q=abs(p)-vec2(.962,.93); float roundRect=length(max(q,0.))+min(max(q.x,q.y),0.)-.035; float mask=1.-smoothstep(-.007,.007,roundRect); float rim=1.-smoothstep(.012,.035,abs(roundRect)); col+=vec3(.12,.19,.24)*rim*.24; gl_FragColor=vec4(col,uOpacity*mask);}`;

/** Final full-frame lens pass carries the reveal/portal ripple over cards and background together. */
export const compositeFragment = `precision highp float; varying vec2 vUv;
uniform sampler2D uScene,uServiceMap; uniform vec2 uAspect;
uniform float uTime,uReveal,uRainbow,uDiveBlur,uScreenReveal,uServiceAspect,uServiceIsVideo;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
vec3 sceneAt(vec2 uv){ return texture2D(uScene,clamp(uv,vec2(.002),vec2(.998))).rgb; }
void main(){
vec2 c=vUv-.5; vec2 rad=c*vec2(uAspect.x,1.); float r=length(rad);
// Burst open, after the reference's final composite: the scene starts
// magnified 2x and expands to full size inside a soft radial front, with a
// single sine-envelope lens push (no oscillating rings).
float L=clamp(uReveal,0.,1.); float e=1.-pow(1.-L,3.);
float front=L*1.4; float soft=mix(.2,.9,L);
float env=sin(L*3.14159265)*.1*(1.-smoothstep(0.,max(front,.001),r));
vec2 uv=.5+c*mix(.5,1.,e)*(1.-env);
float mask=mix(1.-smoothstep(front-soft,front,r),1.,step(.999,L));
vec3 color;
if(uDiveBlur>.001){
  // Flying into the side of the R: zoom streaks plus a sideways smear.
  vec3 acc=vec3(0.);
  for(int i=0;i<10;i++){ float k=float(i)/9.; acc+=sceneAt(.5+(uv-.5)*(1.-k*.16*uDiveBlur)+vec2(k*.04*uDiveBlur,0.)); }
  color=acc/10.;
} else { color=sceneAt(uv); }
color*=mask;
if(uRainbow>.001){
  float hue=uv.y*.55+uv.x*.06+sin(uv.y*5.+uTime*.3)*.05+uTime*.025;
  vec3 rb=.52+.48*cos(6.2831853*(hue+vec3(0.,.33,.67)));
  rb=mix(rb,vec3(1.),pow(abs(sin(uv.y*9.+uTime*.4)),18.)*.2);
  rb=sRGBTransferEOTF(vec4(clamp(rb,0.,1.),1.)).rgb;
  // The rainbow face becomes a screen: service media shows through animated
  // noise, with a barrel lens and RGB taps that relax as it resolves.
  vec2 m=c; if(uServiceAspect>uAspect.x){ m.x*=uAspect.x/uServiceAspect; } else { m.y*=uServiceAspect/uAspect.x; }
  float lensK=(1.-uScreenReveal)*.6;
  vec2 lm=m*(1.-lensK*dot(m,m));
  vec2 ca=m*.012*(1.-uScreenReveal*.7);
  vec3 media=vec3(texture2D(uServiceMap,clamp(lm+ca+.5,vec2(.002),vec2(.998))).r,texture2D(uServiceMap,clamp(lm+.5,vec2(.002),vec2(.998))).g,texture2D(uServiceMap,clamp(lm-ca+.5,vec2(.002),vec2(.998))).b);
  media=mix(media,sRGBTransferEOTF(vec4(media,1.)).rgb,uServiceIsVideo);
  float n=noise(vUv*vec2(uAspect.x,1.)*6.+vec2(uTime*.5,-uTime*.3))*.72+noise(vUv*34.-uTime)*.28;
  float reveal=smoothstep(n-.07,n+.07,uScreenReveal*1.24-.12);
  color=mix(color,mix(rb,media,reveal),uRainbow);
}
gl_FragColor=vec4(color,1.);
#include <colorspace_fragment>
}`;

/** Service screen: a bowed panel whose depth wave evolves with time and scroll. */
export const serviceScreenVertex = `uniform float uTime,uWave,uBow,uScroll,uSize; varying vec2 vUv;
void main(){ vUv=uv; vec3 p=position; float nx=uv.x*2.-1.; float ny=uv.y*2.-1.;
p.z+=cos(nx*1.3)*uBow*uSize;
p.z+=(sin(nx*3.1+uTime*1.3+uScroll*9.)*.5+sin(ny*2.4-uTime*1.05+nx*1.8)*.28)*uWave*uSize;
p.y+=sin(nx*2.2+uTime*.9+uScroll*6.)*uWave*uSize*.05;
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`;
