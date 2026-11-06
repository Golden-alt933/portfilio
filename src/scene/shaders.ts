/** Standalone GLSL keeps render passes readable and makes the scene boundaries explicit. */
export const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const refractionVertex = `uniform float uDepthScale,uRipple,uTime,uMorph,uHalfDepth,uHalfHeight; varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vLocal; void main(){ vUv=uv; vLocal=position; vec3 p=position; float radius=length(p.xy); p.z*=uDepthScale; p.z+=sin(radius*5.-uTime*2.)*uRipple*.018; vec4 world=modelMatrix*vec4(p,1.0); vWorld=world.xyz; vNormal=normalize(mat3(modelMatrix)*normal); vec4 o=projectionMatrix*viewMatrix*world; o.xyz/=o.w; o.w=1.; vec4 sc=vec4(p.z/max(uHalfDepth*uDepthScale,.001)*1.03,p.y/uHalfHeight*1.03,o.z,1.); gl_Position=mix(o,sc,uMorph); }`;

export const backgroundFragment = `precision highp float; varying vec2 vUv;
uniform float uTime,uFlatten,uLight,uContact,uReveal,uServices,uAspect,uPortalReveal,uPortalIsVideo,uPortalAspect,uWorks,uWorksX,uWorksY,uWorkMedia,uScroll;
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
// As the R flattens into its outline, the cylinder unrolls into a flat wall.
vec2 wall=mix(vec2(th,roomP.y*cos(th)),roomP,uFlatten)*.62+.5;
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
vec3 pat=panelPattern(mode,pUv,rnd);
if(fade>.001) pat=mix(pat,panelPattern(nextMode,pUv,rnd),fade);
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
pat*=1.-abs(uWorks)*.55;
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

export const refractionFragment = `precision highp float; varying vec2 vUv; varying vec3 vNormal,vWorld,vLocal;
uniform sampler2D uScene,uFluid,uInk; uniform samplerCube uEnv; uniform vec2 uResolution; uniform vec3 uIorRGB;
uniform float uTime,uLight,uReveal,uServices,uContact,uRoughness,uNoiseScale,uRipple; uniform vec3 uTint; uniform mat3 uLetterRot;
vec3 sceneAt(vec2 uv){ return texture2D(uScene,clamp(uv,vec2(.002),vec2(.998))).rgb; }
float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
// Sine-free hash: no visible grid or banding in the noise.
float hash3(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm(vec3 p){ float a=.5,s=0.; for(int i=0;i<3;i++){ s+=a*vnoise(p); p=p*2.07+vec3(1.7,9.2,4.3); a*=.5; } return s; }
// Monochrome studio for reflections: soft white key above, black below.
float studio(vec3 d){ return smoothstep(-.2,.9,d.y)*.85+pow(max(dot(d,normalize(vec3(-.6,.5,.7))),0.),24.)*1.6; }
vec2 toScreen(vec3 d){ vec4 v=viewMatrix*vec4(d,0.); return v.xy; }
// Glass R after the reference A:
// 1. Rough surface: a 4-octave height field in the letter's own space is
//    turned into a bumped normal (derivative bump mapping), so the surface
//    reads as hammered, displaced glass and every refraction wobbles with it.
// 2. Ray-marched refraction: each colour channel is refracted with its own
//    index; the refracted ray is marched through the body in five steps,
//    picking up interior noise at each step, and the scene is sampled along
//    it. Thicker paths (toward the edges) bend further.
// 3. Grading: each channel keeps only the brightness of what it sees, so
//    the glass is black and white wherever the channels agree, and turns
//    into thin rainbow fringes only where dispersion pulls them apart.
void main(){
vec3 N=normalize(vNormal); if(!gl_FrontFacing) N=-N;
vec3 V=normalize(cameraPosition-vWorld); vec3 I=-V;
vec2 screen=gl_FragCoord.xy/uResolution; vec2 vel=texture2D(uFluid,screen).rg;
// 1. Displacement-style bump, computed per pixel: the height field's
// gradient is taken in the letter's own space and rotated to world space,
// so the dents are smooth (no 2x2 pixel blocks) and turn with the letter.
float k=uNoiseScale*.15;
vec3 hp=vLocal*k+vec3(0.,0.,uTime*.02);
float e=.03;
float h=fbm(hp);
vec3 gObj=vec3(fbm(hp+vec3(e,0.,0.))-h,fbm(hp+vec3(0.,e,0.))-h,fbm(hp+vec3(0.,0.,e))-h)/e*k;
vec3 gW=uLetterRot*gObj;
float bump=.05+uRoughness*.35;
N=normalize(N-(gW-dot(gW,N)*N)*bump);
float ndv=clamp(dot(N,V),0.,1.); float edge=1.-ndv;
// 2. Ray-marched, per-channel refraction.
float thick=.2+.42*pow(edge,1.5);
float spread=(uIorRGB.r-uIorRGB.b)*3.*(1.+edge*2.5);
vec3 tR=refract(I,N,1./(1.47-spread)), tG=refract(I,N,1./1.47), tB=refract(I,N,1./(1.47+spread));
vec2 base=toScreen(I);
vec2 oR=(toScreen(tR)-base)*thick, oG=(toScreen(tG)-base)*thick, oB=(toScreen(tB)-base)*thick;
vec3 acc=vec3(0.); float wsum=0.;
for(int i=0;i<5;i++){
  float t=(float(i)+1.)/5.;
  vec3 ip=vLocal*2.2+N*t*.6;
  vec2 wob=(vec2(vnoise(ip),vnoise(ip+5.3))-.5)*.008*(.4+uRoughness*3.)*t;
  vec2 o=screen+wob+vel*.003;
  float w=.4+t;
  acc+=vec3(lum(sceneAt(o+oR*t)),lum(sceneAt(o+oG*t)),lum(sceneAt(o+oB*t)))*w;
  wsum+=w;
}
vec3 refr=acc/wsum;
// 3. Stark contrast, slightly cooler where the glass is thick.
refr=smoothstep(vec3(.1),vec3(.72),refr);
refr=refr*refr*(3.-2.*refr);
refr=refr*mix(.95,1.1,edge)+.012;
// Fresnel reflection, white glints and a crisp bright line on the bevels.
float F=.04+.96*pow(edge,4.);
vec3 R=reflect(I,N);
vec3 color=mix(refr,vec3(studio(R)),F*.9);
vec3 L=normalize(vec3(-1.,.8,1.)); vec3 H=normalize(L+V);
float a2=.0016; float ndh=max(dot(N,H),0.); float dd=ndh*ndh*(a2-1.)+1.;
color+=vec3(min(a2/(3.14159*dd*dd),30.)*.03);
// Broader second light catches the dents as soft glints across the face.
vec3 L2=normalize(vec3(.8,.4,1.)); vec3 H2=normalize(L2+V); float b2=.02; float nh2=max(dot(N,H2),0.); float d2=nh2*nh2*(b2-1.)+1.;
color+=vec3(min(b2/(3.14159*d2*d2),12.)*.025);
color+=vec3(smoothstep(.55,.9,edge)*(1.-smoothstep(.9,1.,edge))*.18);
color*=uTint;
float contour=step(.58,fract((vUv.x+vUv.y)*42.)); vec3 light=vec3(.17,.78,.73); color=mix(color,light,.38*uLight*contour); color=mix(color,vec3(.84,.98,.95),uLight*.14);
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

/** Work card as a thick glass slab, after the reference's thumbnail shader:
 *  a rounded bevel runs round the edge (simulated from the card's rounded-
 *  rectangle distance), and the image is refracted along that bevel's normal
 *  with four spectral samples per colour channel, so the rim bends the image
 *  and splits into rainbow fringes while the middle stays sharp. A thin
 *  Fresnel reflection, a specular glint on the bevel and a soft edge
 *  vignette finish it. */
export const panelFragment = `precision highp float; varying vec2 vUv; uniform sampler2D uMap,uMedia; uniform float uOpacity,uMediaMix,uMediaIsVideo,uMediaAspect,uMapAspect,uFrameAspect,uDim;
vec2 coverUv(vec2 uv,float aspect){ vec2 p=uv-.5; if(aspect>uFrameAspect){p.x*=uFrameAspect/aspect;} else {p.y*=aspect/uFrameAspect;} return clamp(p+.5,vec2(.002),vec2(.998)); }
vec3 imageAt(vec2 uv){
  if(uMediaMix>.999){ vec3 v=texture2D(uMedia,coverUv(uv,uMediaAspect)).rgb; return mix(v,sRGBTransferEOTF(vec4(v,1.)).rgb,uMediaIsVideo); }
  vec3 a=texture2D(uMap,coverUv(uv,uMapAspect)).rgb;
  vec3 m=texture2D(uMedia,coverUv(uv,uMediaAspect)).rgb;
  m=mix(m,sRGBTransferEOTF(vec4(m,1.)).rgb,uMediaIsVideo);
  return mix(a,m,clamp(uMediaMix,0.,1.));
}
void main(){
vec2 p=(vUv-.5)*2.;
vec2 pa=p*vec2(uFrameAspect,1.);
vec2 halfS=vec2(uFrameAspect,1.)*.965;
float rad=.1;
vec2 q=abs(pa)-halfS+rad;
float sd=length(max(q,0.))+min(max(q.x,q.y),0.)-rad;
float aa=fwidth(sd)*1.2;
float mask=1.-smoothstep(-aa,aa,sd);
// Bevel: 0 in the flat middle, rising to 1 at the rim with a rounded profile.
float bevelW=.24;
float b=clamp(1.+sd/bevelW,0.,1.);
float prof=1.-sqrt(max(0.,1.-b*b));
vec2 g=(q.x>0.&&q.y>0.)?normalize(q):(q.x>q.y?vec2(1.,0.):vec2(0.,1.));
g*=sign(pa);
vec2 n2=g*prof;
vec2 nUv=n2/vec2(uFrameAspect,1.);
// Spectral refraction along the bevel normal, four samples per channel.
vec3 col;
if(prof<.0005){ col=imageAt(vUv); }
else {
  col=vec3(0.);
  for(int i=0;i<2;i++){
    float k=1.+float(i)*.14;
    col.r+=imageAt(vUv-nUv*.06*k).r;
    col.g+=imageAt(vUv-nUv*.09*k).g;
    col.b+=imageAt(vUv-nUv*.12*k).b;
  }
  col*=.5;
}
col*=uDim;
// Soft edge vignette, as the reference.
col*=mix(.78,1.,1.-smoothstep(.55,1.15,length(p*vec2(.9,1.))));
col*=1.-prof*.18;
// Thin Fresnel reflection and a cool sheen across the face.
float fres=pow(prof,2.);
vec3 sky=mix(vec3(.18,.22,.3),vec3(.85,.9,1.),clamp(.5+.5*(n2.y*.8+vUv.y*.4),0.,1.));
col=mix(col,sky,fres*.35);
col+=vec3(.9,.95,1.)*smoothstep(.3,0.,abs(vUv.x*.7+vUv.y-1.2))*.035;
// Rainbow fringe and a specular glint riding the bevel.
vec3 film=.5+.5*cos(6.2831*(b*.9+atan(g.y,g.x)*.08+vec3(0.,.33,.67)));
col+=film*pow(b,2.5)*.22;
float glint=pow(max(dot(normalize(g+vec2(1e-4)),normalize(vec2(-.55,.85))),0.),6.)*smoothstep(.5,.95,b);
col+=vec3(1.)*glint*.35;
gl_FragColor=vec4(col,uOpacity*mask);}`;

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
vec3 mainCol=sceneAt(uv+fl*.014)*(1.+fll*.6)+vec3(.82,.86,.9)*smoothstep(.02,1.2,fll)*.11;
vec3 serviceCol=texture2D(uServiceTex,clamp(uv+fl*.01,vec2(.001),vec2(.999))).rgb*(1.+fll*.8)*smoothstep(1.5,.3,length(cuv));
vec3 col=mix(mainCol,serviceCol,step(.9999,uVisibleService));
// Tight single-pass bloom on the brightest highlights only. Wide, sparse
// taps drew visible offset copies of the R and CREATE, so radii stay small.
vec3 bloom=vec3(0.);
for(int i=0;i<6;i++){
  float a=float(i)*1.0471976+.26; vec2 d=vec2(cos(a)/uAspect.x,sin(a));
  bloom+=max(sceneAt(uv+d*.0022)-.94,0.)+max(sceneAt(uv+d*.005)-.94,0.)*.6;
}
col+=bloom/6.*.65*(1.-step(.9999,uVisibleService));
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
