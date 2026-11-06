/** Standalone GLSL keeps render passes readable and makes the scene boundaries explicit. */
export const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const refractionVertex = `uniform float uDepthScale,uRipple,uTime,uMorph,uHalfDepth,uHalfHeight; varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; varying vec3 vLocal; void main(){ vUv=uv; vLocal=position; vec3 p=position; float radius=length(p.xy); p.z*=uDepthScale; p.z+=sin(radius*5.-uTime*2.)*uRipple*.018; vec4 world=modelMatrix*vec4(p,1.0); vWorld=world.xyz; vNormal=normalize(mat3(modelMatrix)*normal); vec4 o=projectionMatrix*viewMatrix*world; o.xyz/=o.w; o.w=1.; vec4 sc=vec4(p.z/max(uHalfDepth*uDepthScale,.001)*1.03,p.y/uHalfHeight*1.03,o.z,1.); gl_Position=mix(o,sc,uMorph); }`;

export const backgroundFragment = `precision highp float; varying vec2 vUv;
uniform float uTime,uFlatten,uLight,uContact,uReveal,uServices,uAspect,uPortalReveal,uPortalIsVideo,uPortalAspect,uWorks,uWorksX,uWorksY,uWorkMedia,uScroll;
uniform sampler2D uFluid,uInk,uPortalMedia,uWorksMap,uGlyphs,uMarquee;
uniform float uPatCur,uPatNext,uPatSel,uPatType,uBlackOut,uBlackHash,uShift,uShiftPower,uShiftHash,uGlyphMode;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
// Value noise bunches round .5; stretch it so thresholds land like a texture's.
float st(float n){ return clamp((n-.5)*1.7+.5,0.,1.); }
// An edit timeline: video tracks of clips with frame thumbnails, audio tracks
// with waveforms, all sliding under a white playhead.
vec3 timelinePattern(vec2 p){
  float y=p.y*9.; float k=floor(y); float fy=fract(y);
  float len=.55+hash(vec2(k,3.1))*1.3;
  float xl=(p.x*3.2+uTime*.22)/len; float c=floor(xl); float fx=fract(xl);
  float ch=hash(vec2(c,k*1.7+.3));
  float audio=step(k,2.5);
  float clip=step(.2,ch)*smoothstep(.02,.035,fx)*smoothstep(.98,.965,fx)*smoothstep(.12,.15,fy)*smoothstep(.88,.85,fy);
  vec3 col=ch<.42?vec3(.3,.14,1.):ch<.62?vec3(.12,.42,1.):ch<.8?vec3(.62,.9,1.):vec3(1.,.42,.08);
  if(audio>.5) col=ch<.6?vec3(.1,.75,.85):vec3(.55,.95,.9);
  float thumb=hash(vec2(floor(fx*len*4.),c+k*13.));
  vec3 body=col*(.35+.4*thumb);
  float wave=(noise(vec2(xl*len*16.,k*5.))*.75+.15)*(.6+.4*noise(vec2(xl*len*3.,k)));
  if(audio>.5) body=mix(col*.18,col,step(abs(fy-.5),wave*.33));
  else body=mix(body,col*1.15,step(.74,fy));
  vec3 o=vec3(.03,.035,.07)+vec3(.04,.045,.08)*(1.-smoothstep(0.,.03,fy));
  o=mix(o,body,clip);
  o=mix(o,vec3(1.),1.-smoothstep(.002,.006,abs(p.x-.8)));
  return o;
}
// A code editor split in two panes: indented lines of syntax-coloured tokens
// scrolling up, with the odd blinking cursor.
vec3 codePattern(vec2 p){
  float pane=step(.8,p.x); vec2 q=vec2(p.x-pane*.8,p.y);
  float y=q.y*14.-uTime*(.5+.3*pane); float L=floor(y)+pane*97.; float fy=fract(y);
  float cx=q.x*30.;
  float x=cx-3.-floor(hash(vec2(L,1.))*4.)*1.5;
  float n=3.+floor(hash(vec2(L,5.))*6.);
  float blank=step(hash(vec2(L,2.)),.1); float comment=step(.88,hash(vec2(L,4.)));
  float start=0.; float tok=0.; float type=0.;
  for(int i=0;i<8;i++){
    if(float(i)>=n||start>22.) break;
    float w=1.+floor(hash(vec2(L,float(i)+10.))*5.);
    if(x>=start&&x<start+w){ tok=1.; type=hash(vec2(L,float(i)+30.)); }
    start+=w+1.;
  }
  float glyph=tok*(1.-blank)*step(.14,fract(x))*smoothstep(.24,.28,fy)*smoothstep(.76,.72,fy);
  vec3 col=type<.25?vec3(.6,.38,1.):type<.45?vec3(.3,.64,1.):type<.6?vec3(.7,.95,1.):type<.7?vec3(1.,.5,.15):vec3(.88,.9,.95);
  if(comment>.5) col=vec3(.4,.45,.58);
  vec3 o=vec3(.04,.045,.09)+vec3(.05,.06,.13)*step(.92,hash(vec2(L,8.)));
  o+=vec3(.3,.32,.42)*step(.6,cx)*step(cx,2.)*step(.14,fract(cx))*smoothstep(.34,.38,fy)*smoothstep(.66,.62,fy)*.5*(1.-blank);
  o=mix(o,col,glyph);
  float cur=step(.9,hash(vec2(L,7.)))*(1.-blank)*step(start-1.,x)*step(x,start)*step(.2,fy)*step(fy,.8)*step(.5,fract(uTime*1.6));
  o=mix(o,vec3(.9,.95,1.),cur);
  o+=vec3(.05,.06,.1)*(1.-smoothstep(0.,.004,abs(p.x-.8)));
  return o;
}
// The reference's three looks (electric-blue channel noise, black/white
// contour stripes, violet/ice/orange glow) plus the timeline and the code.
// The picture lives in wall space, so every tile shows its part of one image.
vec3 panelPattern(float mode,vec2 p){
  if(mode>2.5) return mode<3.5?timelinePattern(p):codePattern(p);
  float t=uTime*.06;
  vec2 q=p*2.4;
  vec2 r=q+vec2(noise(q+vec2(t,0.)),noise(q*1.3-vec2(0.,t)+3.1))*1.5;
  float ny0=noise(r*2.1-t*.8+5.);
  float nx=st(noise(r*1.7+t)), ny=st(ny0), nz=st(noise(r*2.6+t*.6+9.)), nw=noise(r*.8+t*.5+13.);
  // Channels share one field, so it runs navy, electric blue, ice white.
  if(mode<.5){ float b=nz*.85+nx*.15; return vec3(smoothstep(.55,1.,b),smoothstep(.25,1.,b*.92+ny*.08),smoothstep(0.,1.,b))*vec3(.3,.4,.6)*2.; }
  if(mode<1.5) return vec3(step(.5,fract(nw*9.)))*.85;
  vec3 c=vec3(.207,.059,.992);
  c=mix(c,vec3(.698,.929,1.),smoothstep(.5,.9,st(nw)));
  c=mix(c,vec3(.992,.373,.047),smoothstep(.55,.95,ny0));
  return c;
}
float plusMark(vec2 cell){ vec2 d=abs(fract(cell+.5)-.5)/max(fwidth(cell),vec2(1e-4)); return max(step(d.x,.6)*step(d.y,9.),step(d.y,.6)*step(d.x,9.)); }
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
// Mostly two sizes, as in the reference, with the odd quarter tile.
for(int i=0;i<2;i++){
  float h=hash(id*1.37+vec2(panelLayout*3.1,float(i)*7.7));
  if(h<(i==0?.45:.8)) break;
  vec2 q=step(.5,f); id=id*2.+q; f=fract(f*2.); size*=.5;
}
float rnd=hash(id+panelLayout*.37);
vec2 tileC=(id+.5)*size/vec2(7.,4.);
// The whole wall changes look at once: a hard cut, a scatter where each tile
// flips on its own beat, or a sweep where tiles turn over left to right.
float sel=step(.5,uPatSel); float flip=1.;
if(uPatType>.5&&uPatType<1.5) sel=step(rnd,uPatSel);
if(uPatType>1.5){ float fd=smoothstep(0.,1.,clamp(uPatSel*2.-tileC.x,0.,1.)); fd=fd>=1.?1.:1.-pow(2.,-10.*fd); sel=step(.5,fd); flip=abs(cos(fd*3.14159)); }
float mode=sel>.5?uPatNext:uPatCur;
vec2 ft=vec2((f.x-.5)/max(flip,.001)+.5,f.y);
float hide=1.-smoothstep(0.,.07,layoutPhase)*smoothstep(1.,.93,layoutPhase);
float gap=.016/size+hide*.16*(.6+.4*rnd);
vec2 e=min(ft,1.-ft); float edgeDist=min(e.x,e.y);
float inPanel=smoothstep(gap,gap+.006/size,edgeDist)*step(0.,ft.x)*step(ft.x,1.);
// Glitches: some tiles black out, others show a shifted part of the picture.
float bh=floor(uBlackHash*5.)/5.; float black=step(hash(id+bh+.17),uBlackOut);
float sh=floor(uShiftHash*5.)/5.;
vec2 jump=(vec2(hash(id+sh),hash(id+sh+10.))-.5)*uShiftPower*step(hash(id+sh+3.3),uShift);
vec2 pUv=wall*vec2(1.6,1.)+jump;
vec3 pat=panelPattern(mode,pUv);
// The wordmark and marks run over the tiles, faint, like the reference's logo.
float glyph=0.;
if(uGlyphMode<.5){
  float gy=wall.y*7.; float row=floor(gy); float gv=(fract(gy)-.5)*1.4+.5;
  glyph=texture2D(uMarquee,vec2(wall.x*1.4+sin(row*3.+uTime)*.1,gv)).a*step(0.,gv)*step(gv,1.);
} else if(uGlyphMode<1.5){
  float gy=(wall.y-.5)*4.5+.5; float row=floor(gy); float gv=(fract(gy)-.5)*1.15+.5;
  glyph=texture2D(uMarquee,vec2(wall.x*.9+uTime*.05*sign(row-.5),gv)).a*step(0.,gv)*step(gv,1.)*step(.5,abs(row));
} else {
  vec2 g=ft; g.y=fract(g.y-uTime*.5*hash(id+5.)); g=(g-.5)*(1.3+hash(id+7.)*5.)+.5;
  float gi=floor(hash(id+9.)*4.);
  glyph=texture2D(uGlyphs,vec2((gi+clamp(g.x,0.,1.))/4.,clamp(g.y,0.,1.))).a*step(0.,g.x)*step(g.x,1.)*step(0.,g.y)*step(g.y,1.);
}
pat+=glyph*.2;
pat*=1.-black*.94;
// Dark at the sides, saturated and bright in the middle.
float vd=length((uv-.5)*vec2(min(uAspect,1.5),1.)); float vig=smoothstep(.85,.04,vd);
float luma=dot(pat,vec3(.299,.587,.114)); pat=max(mix(vec3(luma),pat,mix(.35,1.2,vig)),0.);
pat*=vig*sqrt(vig)*(.8+.25*rnd)*.72;
// While the work track is up, the active project plays across the wall,
// softly blurred and split by the panels like a video wall.
if(uWorkMedia>.001){
  vec2 mo=vec2(.012,.012*uAspect);
  vec3 media=(coverMedia(uv)*2.+coverMedia(uv+mo)+coverMedia(uv-mo)+coverMedia(uv+vec2(mo.x,-mo.y))+coverMedia(uv-vec2(mo.x,-mo.y)))/6.;
  media=mix(media,sRGBTransferEOTF(vec4(media,1.)).rgb,uPortalIsVideo);
  pat=mix(pat,media*(.45+.35*rnd),uWorkMedia*.85);
}
// LED dot screen, curved with the wall, and fluid-lit panel rims.
vec2 dg=wall*vec2(1.6,1.)*210.; float dotw=smoothstep(.5,.2,length(fract(dg)-.5));
dotw=mix(dotw,.6,smoothstep(.3,.7,fwidth(dg.x))); pat*=mix(dotw,1.,.6)*1.1;
float rim=(1.-smoothstep(gap,gap+.035/size,edgeDist))*inPanel;
pat+=vec3(.12,.22,.55)*rim*min(length(v)*2.5,1.)*.6;
pat*=1.-abs(uWorks)*.55;
vec3 col=mix(vec3(.004,.005,.009),pat,inPanel);
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
uniform float uTime,uLight,uReveal,uServices,uContact,uRoughness,uNoiseScale,uRipple; uniform vec3 uTint;
// Same technique as the reference A, written for the R:
// - the scene behind is a soft 512x512 copy; it is shifted along the
//   view-space normal by a fixed, strong amount (strongest on the bevels);
// - eight samples per pixel, each with a small random extra slide, applied
//   x1 / x2 / x4 to red / green / blue, averaged into a smooth rainbow smear;
// - a noise field marks rough patches where the samples are scattered;
// - a pin-sharp GGX highlight, Schlick Fresnel (f0 .1) mixing a soft studio
//   reflection, and an overall 1.2 boost so the glass reads luminous.
float rnd(vec2 p){ vec3 q=fract(vec3(p.xyx)*.1031); q+=dot(q,q.yzx+33.33); return fract((q.x+q.y)*q.z); }
float hash3(vec3 p){ p=fract(p*.1031); p+=dot(p,p.zyx+31.32); return fract((p.x+p.y)*p.z); }
float vnoise(vec3 p){ vec3 i=floor(p),f=fract(p); f=f*f*f*(f*(f*6.-15.)+10.);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z); }
vec3 studio(vec3 d){
  vec3 c=mix(vec3(.08,.08,.1),vec3(.42,.46,.52),smoothstep(-.6,.2,d.y));
  c=mix(c,vec3(.92,.94,.97),smoothstep(.2,.95,d.y));
  return c;
}
float ggx(float nh,float r){ float a2=r*r; a2*=a2; float nh2=nh*nh; if(nh2<=0.) return 0.; float d=nh2*(a2-1.)+1.; return a2/(3.14159*d*d); }
void main(){
vec3 Nw=normalize(vNormal); if(!gl_FrontFacing) Nw=-Nw;
vec3 N=normalize((viewMatrix*vec4(Nw,0.)).xyz);
vec3 V=normalize((viewMatrix*vec4(cameraPosition-vWorld,0.)).xyz);
vec2 screen=gl_FragCoord.xy/uResolution;
vec2 vel=texture2D(uFluid,screen).rg;
// Frost over the whole letter: every part gets a base scatter, and a
// domain-warped noise field (several patches across the R, so no region is
// left clear) adds denser ones on top.
vec3 q=vLocal*uNoiseScale*.11;
float n1=vnoise(q), n1b=vnoise(q+vec3(4.7,1.3,8.9));
float n2=vnoise(q*.55+vec3(n1-.5,n1b-.5,0.)*1.2+vec3(3.1,7.7,1.9));
float frost=smoothstep(.25,.75,n2);
float rough=mix(.7,1.15,frost)*uRoughness;
vec2 rn=N.xy*(1.-N.z*.7);
float power=.1;
vec3 acc=vec3(0.);
for(int i=0;i<8;i++){
  float fi=float(i);
  float slide=.005+rnd(gl_FragCoord.xy+fi*19.7)*.007;
  vec2 jit=(vec2(rnd(gl_FragCoord.xy+fi*7.3+.5),rnd(gl_FragCoord.xy+fi*11.1+2.7))-.5)*rough*.3;
  vec2 b=screen+jit+vel*.003;
  acc+=vec3(texture2D(uScene,clamp(b-rn*(power+slide),vec2(.001),vec2(.999))).r,
            texture2D(uScene,clamp(b-rn*(power+slide*2.),vec2(.001),vec2(.999))).g,
            texture2D(uScene,clamp(b-rn*(power+slide*4.),vec2(.001),vec2(.999))).b)*.9;
}
vec3 c=acc/8.;
vec3 L=normalize(vec3(-1.,.8,-1.)); vec3 H=normalize(V+L);
c+=vec3(min(ggx(dot(N,H),.003+frost*uRoughness*.4),40.));
float F=.1+.9*pow(1.-clamp(dot(V,N),0.,1.),5.);
vec3 env=studio(reflect(-V,N));
c+=mix(c,env,F*.9)*(1.-F);
c*=1.2*uTint;
float contour=step(.58,fract((vUv.x+vUv.y)*42.)); vec3 light=vec3(.17,.78,.73); c=mix(c,light,.38*uLight*contour); c=mix(c,vec3(.84,.98,.95),uLight*.14);
gl_FragColor=vec4(c,(1.-uLight*.99)*(1.-uServices*.82)*(1.-uContact)); }`;

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
