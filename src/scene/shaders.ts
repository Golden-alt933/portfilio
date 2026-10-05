/** Standalone GLSL keeps render passes readable and makes the scene boundaries explicit. */
export const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const refractionVertex = `uniform float uDepthScale,uRipple,uTime; varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; void main(){ vUv=uv; vec3 p=position; float radius=length(p.xy); p.z*=uDepthScale; p.z+=sin(radius*5.-uTime*2.)*uRipple*.018; vec4 world=modelMatrix*vec4(p,1.0); vWorld=world.xyz; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*world; }`;

export const backgroundFragment = `precision highp float; varying vec2 vUv; uniform float uTime,uLight,uContact,uReveal,uServices,uAspect; uniform sampler2D uFluid,uInk;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
// Original noise-driven patterns; sparse accents keep the surrounding scene dark.
vec3 inkPattern(float mode,vec2 p,float seed){
  float field=noise(p*vec2(3.8,2.6)+vec2(uTime*.035,seed*5.));
  float curl=noise(p*vec2(6.,4.)+field*.7-vec2(uTime*.018,seed));
  if(mode<.5){ float stripe=smoothstep(.48,.54,fract((p.x+p.y+field*.3)*3.)); return mix(vec3(.006,.01,.025),vec3(.19,.22,.3),stripe); }
  if(mode<1.5){ return mix(vec3(.009,.014,.04),vec3(.12,.035,.38),smoothstep(.26,.78,field))*mix(.6,1.1,curl); }
  vec3 pigment=mix(vec3(.05,.018,.18),vec3(.035,.3,.44),smoothstep(.35,.8,field));
  return mix(pigment,vec3(.38,.09,.035),smoothstep(.75,.96,curl)*.7);
}
void main(){
vec2 centered=vUv-.5; float radius=length(centered*vec2(min(uAspect,1.8),1.));
float front=uReveal*1.25;
float revealRing=exp(-pow((radius-front)*13.,2.));
float lens=sin(clamp(uReveal,0.,1.)*3.14159265)*revealRing*.055;
vec2 lensUv=clamp(vUv-centered/max(radius,.001)*lens,vec2(.001),vec2(.999));
vec2 v=texture2D(uFluid,lensUv).rg; vec2 uv=lensUv+v*.026;
// Short, asynchronous scan-band displacements echo the reference's tile UV jumps.
float glitchEpoch=floor(uTime*1.2); float glitchPhase=fract(uTime*1.2);
float band=floor(uv.y*19.); float glitch=step(.88,hash(vec2(band,glitchEpoch)))*(1.-smoothstep(.025,.095,glitchPhase));
uv.x+=glitch*(hash(vec2(band+5.,glitchEpoch))-.5)*.09;
float n=noise(uv*vec2(20.,12.)+uTime*.025); float n2=noise(uv*vec2(51.,34.)-uTime*.018);
vec3 a=vec3(.002,.004,.01), b=vec3(.012,.019,.039), c=vec3(.022,.014,.065); vec3 col=mix(a,b,smoothstep(.38,.73,n)); col=mix(col,c,smoothstep(.65,.92,n2)*.2);
vec2 curved=(uv-.5); curved.x*=1.+curved.y*curved.y*.8; curved.y+=curved.x*curved.x*.11; curved+=.5;
vec2 coarse=curved*vec2(5.,3.); float split=step(.5,hash(floor(coarse))); vec2 cell=curved*mix(vec2(5.,3.),vec2(10.,6.),split); vec2 id=floor(cell), f=fract(cell); float rand=hash(id); float edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y)); float tile=step(.38,rand)*smoothstep(.005,.013,edge);
float epoch=floor(uTime*.65+rand*3.); float phase=fract(uTime*.65+rand*3.);
float shifted=step(.76,hash(id+epoch)); float pulse=(1.-smoothstep(.05,.24,phase))*shifted;
vec2 inkUv=f+vec2(hash(id+epoch+11.)-.5,hash(id+epoch+27.)-.5)*pulse*.5+v*.015;
float cycle=uTime/6.+rand*1.7; float mode=mod(floor(cycle),3.); float nextMode=mod(mode+1.,3.);
float blend=smoothstep(.78,1.,fract(cycle));
vec3 tileInk=mix(inkPattern(mode,inkUv,rand),inkPattern(nextMode,inkUv,rand),blend);
float blackout=1.-step(.86,hash(id+epoch+91.))*(1.-smoothstep(.04,.18,phase))*.85;
float tileFocus=1.-smoothstep(.15,.78,length((uv-.5)*vec2(1.05,.8))); col=mix(col,tileInk*blackout,tile*.34*tileFocus*(1.-uServices));
float grid=min(abs(fract(curved.x*48.)-.5),abs(fract(curved.y*36.)-.5)); float gridLine=1.-smoothstep(0.,.018,grid); float crossX=1.-smoothstep(.012,.025,abs(fract(curved.x*8.)-.5)); float crossY=1.-smoothstep(.012,.025,abs(fract(curved.y*6.)-.5)); float cross=crossX*crossY;
col+=vec3(.022,.032,.062)*(gridLine*.32+cross*.5); col=mix(col,vec3(.012,.023,.024)+vec3(.15,.23,.22)*(gridLine*.23+cross*.65),uServices);
// Pigment is advected by the existing velocity solve. Two broad taps provide a
// restrained optical glow without another full-resolution postprocessing pass.
vec3 pigment=texture2D(uInk,clamp(uv,vec2(.001),vec2(.999))).rgb;
vec3 halo=(texture2D(uInk,clamp(uv+vec2(.025,.014),vec2(.001),vec2(.999))).rgb+texture2D(uInk,clamp(uv-vec2(.025,.014),vec2(.001),vec2(.999))).rgb)*.5;
float wisps=.65+.35*noise(uv*85.+v*.4-uTime*.08);
col+=(pigment*.55*wisps+halo*.12)*(1.-uServices*.8)*(1.-uLight);
float lightWipe=mix(smoothstep(uv.y-.075,uv.y+.075,uLight)*step(.001,uLight),1.,smoothstep(.96,1.,uLight)); vec3 lightCol=vec3(.76,.82,.81); col=mix(col,lightCol,lightWipe); col=mix(col,vec3(.4,.55,.53),clamp(lightWipe*(gridLine*.045+cross*.2),0.,.3));
float vignette=1.-smoothstep(.18,.82,length((uv-.5)*vec2(.9,1.))); col*=mix(mix(.55,1.,vignette),1.,uLight); col+=vec3(.022,.04,.11)*min(length(v),1.)*.12*(1.-uLight);
col=mix(col,vec3(.006,.008,.012),uContact*.98); float scan=step(.996,fract(uv.y*250.)); col+=vec3(.012,.018,.035)*scan*(1.-uContact)*(1.-uLight);
// An irregular advancing front and small satellite droplets replace the perfect
// circular wipe. At completion the mask resolves to one, including wide screens.
float lobe=noise(centered*13.+vec2(uReveal*1.2,-uReveal))*.1+noise(centered*36.)*.035;
float revealMask=(1.-smoothstep(front+lobe,front+lobe+.1,radius))*smoothstep(0.,.04,uReveal);
revealMask=mix(revealMask,1.,smoothstep(.8,1.,uReveal));
col*=revealMask; gl_FragColor=vec4(col,1.); }`;

export const refractionFragment = `precision highp float; varying vec2 vUv; varying vec3 vNormal,vWorld; uniform sampler2D uScene,uFluid,uInk; uniform samplerCube uEnv; uniform vec2 uResolution; uniform vec3 uIorRGB; uniform float uTime,uLight,uReveal,uServices,uContact,uRoughness,uNoiseScale;
float surfaceNoise(vec3 p){ return sin(p.x*uNoiseScale+sin(p.y*uNoiseScale*.63)+uTime*.2)*sin(p.y*uNoiseScale*.81+p.z*4.); }
void main(){ vec3 baseN=normalize(vNormal); vec3 N=normalize(baseN+vec3(surfaceNoise(vWorld)*.035, surfaceNoise(vWorld.yzx+3.)*.035,0.)); vec3 V=normalize(cameraPosition-vWorld); vec2 screen=gl_FragCoord.xy/uResolution; vec2 vel=texture2D(uFluid,screen).rg;
vec2 bend=N.xy*.09+vec2(surfaceNoise(vWorld),surfaceNoise(vWorld.yzx+5.))*.006+vel*.004; vec2 roughDir=normalize(N.xy+vec2(.0001)); float blur=uRoughness*(.004+abs(surfaceNoise(vWorld))*.006); vec2 d=roughDir*blur; vec3 a=texture2D(uScene,clamp(screen+bend+d,vec2(.002),vec2(.998))).rgb; vec3 b=texture2D(uScene,clamp(screen+bend-d,vec2(.002),vec2(.998))).rgb; vec3 c=texture2D(uScene,clamp(screen+bend+d.yx,vec2(.002),vec2(.998))).rgb; vec3 e=texture2D(uScene,clamp(screen+bend-d.yx,vec2(.002),vec2(.998))).rgb;
vec3 f=texture2D(uScene,clamp(screen+bend+d*1.7,vec2(.002),vec2(.998))).rgb; vec3 g=texture2D(uScene,clamp(screen+bend-d*1.7,vec2(.002),vec2(.998))).rgb; vec3 h=texture2D(uScene,clamp(screen+bend+d.yx*1.7,vec2(.002),vec2(.998))).rgb; vec3 i=texture2D(uScene,clamp(screen+bend-d.yx*1.7,vec2(.002),vec2(.998))).rgb;
vec3 softened=(a+b+c+e+f+g+h+i)*.125; vec3 rayR=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.r); vec3 rayG=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.g); vec3 rayB=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.b);
vec2 offsetR=rayR.xy/max(.2,abs(rayR.z))*.11; vec2 offsetG=rayG.xy/max(.2,abs(rayG.z))*.11; vec2 offsetB=rayB.xy/max(.2,abs(rayB.z))*.11;
vec3 dispersed=vec3(texture2D(uScene,clamp(screen+offsetR+vel*.004,vec2(.002),vec2(.998))).r,texture2D(uScene,clamp(screen+offsetG+vel*.004,vec2(.002),vec2(.998))).g,texture2D(uScene,clamp(screen+offsetB+vel*.004,vec2(.002),vec2(.998))).b); vec3 refr=mix(dispersed,softened,clamp(uRoughness*3.,0.,.8));
vec3 reflected=textureCube(uEnv,reflect(-V,N)).rgb; float bands=pow(max(0.,dot(N,normalize(vec3(.05,.56,.83)))),4.)*.95+pow(max(0.,dot(N,normalize(vec3(-.72,.2,.66)))),10.)*.7; float bevelLight=pow(max(0.,dot(N,normalize(vec3(.45,-.25,.86)))),22.)*.85;
float grain=surfaceNoise(vWorld)*.018; float fresnel=pow(1.-max(dot(N,V),0.),5.); vec3 studio=max(reflected,vec3(.13,.19,.3)); vec3 ink=texture2D(uInk,clamp(screen+bend*.5,vec2(.002),vec2(.998))).rgb;
vec3 color=refr*.98+studio*(.07+fresnel*.55)+vec3(.48,.63,.91)*bands*.43+vec3(.72,.85,1.)*bevelLight*.7+grain+ink*(.12+fresnel*.16);
float contour=step(.58,fract((vUv.x+vUv.y)*42.)); vec3 light=vec3(.17,.78,.73); color=mix(color,light,.38*uLight*contour); color=mix(color,vec3(.84,.98,.95),uLight*.14); color*=1.+min(length(vel),1.)*.12; gl_FragColor=vec4(color,(1.-uLight*.99)*(1.-uServices*.82)*(1.-uContact)*smoothstep(0.,.45,uReveal)); }`;

export const displayFragment = `precision highp float; varying vec2 vUv; uniform float uOpacity,uTime; void main(){float bands=.5+.5*sin(vUv.y*8.+uTime*.45); vec3 c=mix(vec3(.05,.2,.28),vec3(.15,.9,.82),vUv.y*.62+bands*.12); float grid=step(.94,fract(vUv.x*12.))*.22+step(.94,fract(vUv.y*18.))*.16; c+=vec3(grid); gl_FragColor=vec4(c,uOpacity*.7);}`;

export const panelVertex = fullscreenVertex;

export const panelFragment = `precision highp float; varying vec2 vUv; uniform sampler2D uMap; uniform float uOpacity; void main(){vec2 p=(vUv-.5)*2.; float r=dot(p,p); vec2 uv=vUv+p*r*.012; vec2 d=normalize(p+vec2(.0001))*.0015; vec4 a=texture2D(uMap,clamp(uv+d,vec2(.002),vec2(.998))); vec4 b=texture2D(uMap,clamp(uv-d,vec2(.002),vec2(.998))); vec4 c=texture2D(uMap,clamp(uv+d.yx,vec2(.002),vec2(.998))); vec4 e=texture2D(uMap,clamp(uv-d.yx,vec2(.002),vec2(.998))); vec3 col=(a.rgb+b.rgb+c.rgb+e.rgb)*.17+vec3(a.r,b.g,c.b)*.32; float edge=1.-smoothstep(.72,1.12,length(p)); col*=mix(.82,1.,edge); gl_FragColor=vec4(col,uOpacity);}`;
