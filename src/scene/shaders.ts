/** Standalone GLSL keeps render passes readable and makes the scene boundaries explicit. */
export const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const refractionVertex = `uniform float uDepthScale,uRipple,uTime,uMorph,uHalfDepth,uHalfHeight; varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; void main(){ vUv=uv; vec3 p=position; float radius=length(p.xy); p.z*=uDepthScale; p.z+=sin(radius*5.-uTime*2.)*uRipple*.018; vec4 world=modelMatrix*vec4(p,1.0); vWorld=world.xyz; vNormal=normalize(mat3(modelMatrix)*normal); vec4 o=projectionMatrix*viewMatrix*world; o.xyz/=o.w; o.w=1.; vec4 sc=vec4(p.z/max(uHalfDepth*uDepthScale,.001)*1.03,p.y/uHalfHeight*1.03,o.z,1.); gl_Position=mix(o,sc,uMorph); }`;

export const backgroundFragment = `precision highp float; varying vec2 vUv;
uniform float uTime,uLight,uContact,uReveal,uServices,uAspect,uPortalReveal,uPortalIsVideo,uPortalAspect,uWorks,uWorksX,uWorksY,uWorkMedia,uScroll;
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
float plusMark(vec2 cell){ vec2 d=abs(fract(cell+.5)-.5)/max(fwidth(cell),vec2(1e-4)); return max(step(d.x,.6)*step(d.y,9.),step(d.y,.6)*step(d.x,9.)); }
vec3 hueRotate(vec3 c,float a){ const vec3 k=vec3(.57735); float ca=cos(a); return c*ca+cross(k,c)*sin(a)+k*dot(k,c)*(1.-ca); }
vec3 coverMedia(vec2 uv){
  vec2 m=uv-.5;
  if(uPortalAspect>uAspect){ m.x*=uAspect/uPortalAspect; } else { m.y*=uPortalAspect/uAspect; }
  return texture2D(uPortalMedia,clamp(m+.5,vec2(.002),vec2(.998))).rgb;
}
void main(){
vec2 v=texture2D(uFluid,vUv).rg;
// Fluid velocity nudges the whole wall, as in the reference's scene mixer.
vec2 uv=vUv;
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
// Each panel's palette drifts around the colour wheel on its own clock.
pat=hueRotate(pat,sin(uTime*.13+rnd*6.283)*.6);
pat*=(.55+.5*rnd)*blackout*.56; pat=mix(pat,pat*vec3(.75,.9,1.2),.2);
pat+=pat*pow(max(0.,sin(uTime*.9+rnd*30.)),12.)*.8;
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
  wq+=vec2(uWorksX,uWorksY);
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
float cross=plusMark(wall*8.);
col+=vec3(.05,.06,.08)*(gridLine*.2+cross*.3);
vec2 sg=wall+vec2(uTime*.018,0.); sg.y+=sin(sg.x*5.+uTime*.7)*.018; sg.x+=sin(sg.y*4.-uTime*.5)*.01;
float sGrid=1.-smoothstep(0.,.02,min(abs(fract(sg.x*64.)-.5),abs(fract(sg.y*64.)-.5)));
float sc=plusMark(sg*8.);
col=mix(col,vec3(.012,.018,.022)+vec3(.15,.2,.22)*(sGrid*.25+sc*.7),uServices);
// Pigment glow from the fluid field.
vec3 pigment=texture2D(uInk,clamp(uv,vec2(.001),vec2(.999))).rgb;
vec3 halo=(texture2D(uInk,clamp(uv+vec2(.025,.014),vec2(.001),vec2(.999))).rgb+texture2D(uInk,clamp(uv-vec2(.025,.014),vec2(.001),vec2(.999))).rgb)*.5;
float wisps=.65+.35*noise(uv*85.+v*.4-uTime*.08);
vec3 inkGlow=vec3(0.);
float domeY=uv.y+pow(uv.x-.5,2.)*.55; float lightWipe=mix(smoothstep(domeY-.06,domeY+.06,uLight*1.14-.1)*step(.001,uLight),1.,smoothstep(.96,1.,uLight));
float indigoMix=smoothstep(.02,.26,uLight)*(1.-uServices); vec3 indigo=vec3(.035,.02,.5)+vec3(.05,.05,.24)*(gridLine*.5+cross*.9)+pat*.3*inPanel; col=mix(col,indigo,indigoMix);
vec3 lightCol=vec3(.843,.859,.863); col=mix(col,lightCol,lightWipe);
vec2 pg=vec2((uv.x-.5)*uAspect,uv.y+uScroll*3.)*vec2(16.,16.)+v*1.5;
float pLine=1.-smoothstep(0.,.04,min(abs(fract(pg.x)-.5),abs(fract(pg.y)-.5)));
float pCross=plusMark(pg/4.);
col=mix(col,vec3(.42,.45,.47),clamp(lightWipe*(pLine*.07+pCross*.3),0.,.35));
float vignette=1.-smoothstep(.2,.85,length((uv-.5)*vec2(.9,1.))); col*=mix(mix(.45,1.,vignette),1.,uLight);
col=mix(col,vec3(.006,.008,.012),uContact*.98); col+=vec3(.0,.03,.036)*(1.-smoothstep(0.,.75,length((uv-.5)*vec2(1.,1.7))))*uContact;
col=sRGBTransferEOTF(vec4(max(col,vec3(0.)),1.)).rgb;
col+=inkGlow;
vec3 portal=coverMedia(vUv);
portal=mix(portal,sRGBTransferEOTF(vec4(portal,1.)).rgb,uPortalIsVideo);
col=mix(col,portal*.18,clamp(uPortalReveal,0.,1.)*.35);
gl_FragColor=vec4(col,1.); }`;

export const refractionFragment = `precision highp float; varying vec2 vUv; varying vec3 vNormal,vWorld;
uniform sampler2D uScene,uFluid,uInk; uniform samplerCube uEnv; uniform vec2 uResolution; uniform vec3 uIorRGB;
uniform float uTime,uLight,uReveal,uServices,uContact,uRoughness,uNoiseScale,uRipple; uniform vec3 uTint;
float surfaceNoise(vec3 p){ return sin(p.x*uNoiseScale+sin(p.y*uNoiseScale*.63)+uTime*.2)*sin(p.y*uNoiseScale*.81+p.z*4.); }
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
vec3 sceneAt(vec2 uv){ return texture2D(uScene,clamp(uv,vec2(.002),vec2(.998))).rgb; }
// Glass after the reference's logo shader: the already-rendered scene is
// refracted through the letter with 8 jittered samples whose R/G/B slides
// differ (x1/x2/x4), roughness varies with two noise samples, then a GGX
// highlight, Schlick Fresnel (f0 .1) and an environment reflection are added.
void main(){
vec3 N=normalize(vNormal); vec3 V=normalize(cameraPosition-vWorld);
vec2 screen=gl_FragCoord.xy/uResolution; vec2 vel=texture2D(uFluid,screen).rg;
float n1=surfaceNoise(vWorld), n2=surfaceNoise(vWorld.yzx*1.7+3.);
float rough=clamp(uRoughness*(.7+.45*n1+.35*n2),0.,1.);
vec3 Nv=normalize((viewMatrix*vec4(N,0.)).xyz);
float ior=(uIorRGB.r-uIorRGB.b);
vec2 shift=-Nv.xy*.1;
vec2 dir=normalize(shift+vec2(.0001));
vec2 blurDir=vec2(n1,n2)*rough*.3*.05;
vec3 acc=vec3(0.);
for(int i=0;i<8;i++){
  float fi=float(i);
  float rnd=hash(gl_FragCoord.xy*.37+fi*7.13+fract(uTime)*13.);
  float slide=(.005+rnd*.007)*(.4+ior*8.);
  vec2 o=screen+shift+blurDir*(fi/7.-.5)*2.+vel*.004;
  acc+=vec3(sceneAt(o+dir*slide).r,sceneAt(o+dir*slide*2.).g,sceneAt(o+dir*slide*4.).b);
}
vec3 refr=acc/8.*.9;
vec3 L=normalize(vec3(-1.,.8,1.)); vec3 H=normalize(L+V);
float a=.003+rough*.4; float a2=a*a; float ndh=max(dot(N,H),0.);
float dd=ndh*ndh*(a2-1.)+1.; float spec=a2/(3.14159*dd*dd);
vec3 L2=normalize(vec3(.9,-.3,.6)); vec3 H2=normalize(L2+V); float ndh2=max(dot(N,H2),0.); float dd2=ndh2*ndh2*(a2-1.)+1.; float spec2=a2/(3.14159*dd2*dd2);
float F=.1+.9*pow(1.-max(dot(N,V),0.),5.);
vec3 env=textureCube(uEnv,reflect(-V,N)).rgb;
vec3 color=mix(refr,env*1.15,F*.85)+vec3(1.)*min(spec,8.)*.06*F+vec3(.75,.85,1.)*min(spec2,8.)*.025;
color*=1.2*uTint;
float contour=step(.58,fract((vUv.x+vUv.y)*42.)); vec3 light=vec3(.17,.78,.73); color=mix(color,light,.38*uLight*contour); color=mix(color,vec3(.84,.98,.95),uLight*.14);
color*=1.+min(length(vel),1.)*.12;
gl_FragColor=vec4(color,(1.-uLight*.99)*(1.-uServices*.82)*(1.-uContact)); }`;

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
uniform sampler2D uScene,uLoadingMap,uServiceTex,uFluid; uniform vec2 uAspect;
uniform float uTime,uReveal,uVisibleService;
#define PI 3.14159265359
vec3 sceneAt(vec2 uv){ return texture2D(uScene,clamp(uv,vec2(.001),vec2(.999))).rgb; }
void main(){
vec2 uv=vUv; vec2 cuv=vUv-.5;
// Pointer fluid only warps and brightens the finished frame (no colour).
vec2 fl=texture2D(uFluid,uv).xy; float fll=length(fl);
vec3 mainCol=sceneAt(uv+fl*.01)*(1.+fll*.8);
vec3 serviceCol=texture2D(uServiceTex,clamp(uv+fl*.01,vec2(.001),vec2(.999))).rgb*(1.+fll*.8)*smoothstep(1.5,.3,length(cuv));
vec3 col=mix(mainCol,serviceCol,step(.9999,uVisibleService));
// Opening burst: a soft ring grows with load progress; inside it the scene
// zooms out from 2x, and both scene and loader drawing are pushed radially
// by sin(r*PI), so the push peaks at the ring itself.
float L=uReveal;
if(L<.999){
  vec2 a=cuv; if(uAspect.x>1.){ a.y/=uAspect.x; } else { a.x*=uAspect.x; }
  float r=smoothstep(0.,.2+L*.7,-length(a)+L*1.4);
  vec2 n=normalize(a+vec2(1e-5));
  vec2 sceneUv=(uv-.5)*(.5+L*.5)+.5-sin(r*PI)*n*.1;
  vec2 luv=uv-sin(r*PI)*n*.1;
  vec3 burst=sceneAt(sceneUv+fl*.01);
  vec3 loading=texture2D(uLoadingMap,clamp(luv,vec2(.001),vec2(.999))).rgb;
  col=mix(loading,burst,smoothstep(0.,.5,r));
}
gl_FragColor=vec4(col,1.);
#include <colorspace_fragment>
}`;

/** Service screen: a bowed panel whose depth wave evolves with time and scroll. */
export const serviceScreenVertex = `uniform float uTime,uWave,uBow,uScroll,uSize; varying vec2 vUv;
void main(){ vUv=uv; vec3 p=position; float nx=uv.x*2.-1.; float ny=uv.y*2.-1.;
p.z+=cos(nx*1.3)*uBow*uSize;
p.z+=(sin(nx*3.1+uTime*1.3+uScroll*9.)*.5+sin(ny*2.4-uTime*1.05+nx*1.8)*.28)*uWave*uSize;
p.y+=sin(nx*2.2+uTime*.9+uScroll*6.)*uWave*uSize*.05;
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`;

/** Side face of the R. Its corners interpolate from their projected 3D
 *  positions to the full frame as uMorph goes 0 -> 1 (the service turn). */
export const sideScreenVertex = `uniform float uMorph; varying vec2 vUv;
void main(){ vUv=uv; vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.); p.xyz/=p.w; p.w=1.;
vec4 full=vec4((uv*2.-1.)*1.03,0.,1.);
gl_Position=mix(p,full,uMorph); }`;

/** The side screen: colourful animated noise with grain, through which the
 *  services scene is revealed behind a lens distortion that relaxes. */
export const sideScreenFragment = `precision highp float; varying vec2 vUv;
uniform sampler2D uServiceTex; uniform vec2 uRes; uniform float uServiceIn,uVision,uOpacity,uTime;
float hash(vec2 p){ return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
vec4 noiseTex(vec2 p){ float t=uTime*.1; return vec4(vnoise(p*4.+vec2(t,0.)),vnoise(p*4.3+5.-vec2(0.,t)),vnoise(p*3.7+9.+t),vnoise(p*4.6+13.-t)); }
vec2 lens(vec2 r,float a){ return r*(1.-a*dot(r,r)); }
void main(){
vec2 geoUV=vUv; geoUV.x=(geoUV.x-.5)*.15+.5;
vec2 screenUv=gl_FragCoord.xy/uRes;
vec2 uv=mix(geoUV,screenUv,pow(max(uServiceIn,0.),.2));
vec4 n1=noiseTex(geoUV*1.5);
vec4 n2=noiseTex(geoUV*.45+n1.xy*(2.3+hash(screenUv+fract(uTime))*.2));
vec3 effectCol=.5+.5*cos(6.2831853*(n2.x*1.4+n2.w*.6+vec3(0.,.33,.67)));
effectCol=mix(effectCol,n2.xyz,.25);
float inv=1.-uServiceIn;
vec3 sceneCol=vec3(0.);
for(int i=0;i<5;i++){
  float fi=float(i)/5.;
  vec2 d=uv+(n2.xy-.5)*inv;
  float pw=inv*5.+fi*.2*inv;
  sceneCol.r+=texture2D(uServiceTex,clamp(lens(d-.5,pw)+.5,vec2(.001),vec2(.999))).r;
  sceneCol.g+=texture2D(uServiceTex,clamp(lens(d-.5,1.05*pw)+.5,vec2(.001),vec2(.999))).g;
  sceneCol.b+=texture2D(uServiceTex,clamp(lens(d-.5,1.1*pw)+.5,vec2(.001),vec2(.999))).b;
}
sceneCol/=5.; sceneCol*=1.+inv*3.; sceneCol*=mix(.5+effectCol,vec3(1.),uServiceIn);
float w=smoothstep(0.,smoothstep(0.,1.,n2.z)+.001,-n2.y+uServiceIn*2.);
vec3 outCol=mix(effectCol,sceneCol,w);
outCol+=(hash(gl_FragCoord.xy+fract(uTime*31.)*97.)-.5)*.08*inv;
gl_FragColor=vec4(outCol,smoothstep(0.,.1,uVision)*uOpacity); }`;

/** Services sheet after the reference's list shader: grid, crosses and
 *  thumbnails ride one sine-bent sheet; thumbnails slide as a carousel and
 *  the last one wipes to full frame. */
export const serviceSheetVertex = `uniform float uServiceIn,uTime,uScroll,uFull,uId,uIsLast,uOffsetX,uWave; uniform vec2 uScale;
varying vec2 vUv; varying float vShade; varying float vFull;
#define PI 3.14159265359
void main(){ vUv=uv; vec2 lp=position.xy;
#ifdef IS_THUMB
float x=uId-(uScroll-1.); lp=position.xy*.3; lp.x*=(16./9.)*.85; lp.x+=x*.95+uOffsetX; lp.x-=uFull*.5*(1.-uIsLast);
#else
lp.x*=1.4;
#endif
float theta=lp.x*PI+(1.-uServiceIn)*8.;
vec3 p=vec3(lp.x*uScale.x,lp.y*uScale.y,-sin(theta)*uWave*uServiceIn);
#ifndef IS_THUMB
p.y*=1.7;
#endif
vShade=cos(theta)*uServiceIn*.7;
gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);
vFull=0.;
#ifdef IS_THUMB
float w=smoothstep(0.,1.,-uv.x*.3+uFull*1.3)*uIsLast;
gl_Position=mix(gl_Position,vec4(position.xy*2.,0.,1.),w);
vFull=w;
#endif
}`;

export const serviceGridFragment = `precision highp float; varying vec2 vUv; varying float vShade;
uniform float uTime,uScroll,uServiceIn,uOpacity; uniform vec2 uGrid;
void main(){
vec2 c=vUv; c.x+=uTime*.01+uScroll*.3+uServiceIn*.2;
vec2 g=abs(fract(c*uGrid)-.5);
vec2 px=fwidth(c*uGrid);
float line=max(1.-smoothstep(0.,px.x*1.2,.5-g.x),1.-smoothstep(0.,px.y*1.2,.5-g.y));
vec2 cc=c*uGrid/5.;
vec2 d=abs(fract(cc+.5)-.5)/max(fwidth(cc),vec2(1e-4));
float cross=max(step(d.x,.6)*step(d.y,9.),step(d.y,.6)*step(d.x,9.));
float a=line*.08+cross*.34;
gl_FragColor=vec4(vec3(1.),a*uOpacity); }`;

export const serviceThumbFragment = `precision highp float; varying vec2 vUv; varying float vShade; varying float vFull;
uniform sampler2D uMap; uniform float uOpacity,uIsVideo,uMediaAspect,uScreenAspect;
void main(){
float frame=mix((16./9.)*.85,uScreenAspect,vFull);
vec2 p=vUv-.5; if(uMediaAspect>frame){ p.x*=frame/uMediaAspect; } else { p.y*=uMediaAspect/frame; }
vec3 col=texture2D(uMap,clamp(p+.5,vec2(.001),vec2(.999))).rgb;
col=mix(col,sRGBTransferEOTF(vec4(col,1.)).rgb,uIsVideo);
col*=1.+vShade*.25;
vec2 e=abs(vUv-.5)*2.; col*=mix(.82,1.,1.-smoothstep(.7,1.,max(e.x,e.y))*(1.-vFull));
gl_FragColor=vec4(col,uOpacity); }`;

/** Services backdrop: the active service's media, softly blurred and faint,
 *  filling the frame behind the grid. */
export const serviceBackdropVertex = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
export const serviceBackdropFragment = `precision highp float; varying vec2 vUv;
uniform sampler2D uMap; uniform float uOpacity,uIsVideo,uMediaAspect,uScreenAspect,uTime;
vec3 at(vec2 uv){ vec2 p=uv-.5; if(uMediaAspect>uScreenAspect){ p.x*=uScreenAspect/uMediaAspect; } else { p.y*=uMediaAspect/uScreenAspect; } return texture2D(uMap,clamp(p*.92+.5,vec2(.001),vec2(.999))).rgb; }
void main(){
vec2 o=vec2(.006,.01);
vec3 c=at(vUv)*.28+(at(vUv+o)+at(vUv-o)+at(vUv+vec2(o.x,-o.y))+at(vUv-vec2(o.x,-o.y)))*.12+(at(vUv+o*2.2)+at(vUv-o*2.2))*.12;
c=mix(c,sRGBTransferEOTF(vec4(c,1.)).rgb,uIsVideo);
float v=1.-smoothstep(.3,.9,length((vUv-.5)*vec2(1.,1.2)));
gl_FragColor=vec4(c*mix(.55,1.,v),uOpacity); }`;
