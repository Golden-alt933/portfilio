/** Standalone GLSL keeps render passes readable and makes the scene boundaries explicit. */
export const fullscreenVertex = `varying vec2 vUv; void main(){vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;

export const refractionVertex = `uniform float uDepthScale,uRipple,uTime; varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; void main(){ vUv=uv; vec3 p=position; float radius=length(p.xy); p.z*=uDepthScale; p.z+=sin(radius*5.-uTime*2.)*uRipple*.018; vec4 world=modelMatrix*vec4(p,1.0); vWorld=world.xyz; vNormal=normalize(mat3(modelMatrix)*normal); gl_Position=projectionMatrix*viewMatrix*world; }`;

export const backgroundFragment = `precision highp float; varying vec2 vUv; uniform float uTime,uLight,uContact,uReveal,uServices; uniform sampler2D uFluid;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.-2.*f); return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y); }
// Original noise-driven patterns; sparse accents keep the surrounding scene dark.
vec3 inkPattern(float mode,vec2 p,float seed){
  float field=noise(p*vec2(3.8,2.6)+vec2(uTime*.035,seed*5.));
  float curl=noise(p*vec2(6.,4.)+field*.7-vec2(uTime*.018,seed));
  if(mode<.5){ float contour=step(.52,fract((field+curl*.22)*8.)); return mix(vec3(.024,.033,.047),vec3(.59,.62,.65),contour); }
  if(mode<1.5){ return mix(vec3(.029,.047,.084),vec3(.24,.28,.43),smoothstep(.32,.84,field))*mix(.7,1.1,curl); }
  vec3 pigment=mix(vec3(.15,.049,.27),vec3(.22,.47,.51),smoothstep(.42,.88,field));
  return mix(pigment,vec3(.48,.19,.058),smoothstep(.73,.95,curl)*.75);
}
void main(){
vec2 centered=vUv-.5; float radius=length(centered);
float revealRing=exp(-pow((radius-uReveal*.85)*9.,2.));
float lens=sin(clamp(uReveal,0.,1.)*3.14159265)*revealRing*.06;
vec2 lensUv=clamp(vUv-centered/max(radius,.001)*lens,vec2(.001),vec2(.999));
vec2 v=texture2D(uFluid,lensUv).rg; vec2 uv=lensUv+v*.01; float n=noise(uv*vec2(20.,12.)+uTime*.025); float n2=noise(uv*vec2(51.,34.)-uTime*.018);
vec3 a=vec3(.006,.009,.016), b=vec3(.035,.046,.075), c=vec3(.075,.025,.13); vec3 col=mix(a,b,smoothstep(.38,.73,n)); col=mix(col,c,smoothstep(.65,.92,n2)*.32);
vec2 curved=(uv-.5); curved.x*=1.+curved.y*curved.y*.8; curved.y+=curved.x*curved.x*.11; curved+=.5;
vec2 coarse=curved*vec2(8.,5.); float split=step(.62,hash(floor(coarse))); vec2 cell=curved*mix(vec2(8.,5.),vec2(16.,10.),split); vec2 id=floor(cell), f=fract(cell); float rand=hash(id); float edge=min(min(f.x,1.-f.x),min(f.y,1.-f.y)); float tile=step(.60,rand)*step(.018,edge);
float epoch=floor(uTime*.31+rand*3.); float phase=fract(uTime*.31+rand*3.);
float shifted=step(.76,hash(id+epoch)); float pulse=(1.-smoothstep(.05,.24,phase))*shifted;
vec2 inkUv=f+vec2(hash(id+epoch+11.)-.5,hash(id+epoch+27.)-.5)*pulse*.38;
float cycle=uTime/6.+rand*1.7; float mode=mod(floor(cycle),3.); float nextMode=mod(mode+1.,3.);
float blend=smoothstep(.78,1.,fract(cycle));
vec3 tileInk=mix(inkPattern(mode,inkUv,rand),inkPattern(nextMode,inkUv,rand),blend);
float blackout=1.-step(.86,hash(id+epoch+91.))*(1.-smoothstep(.04,.18,phase))*.85;
float tileFocus=1.-smoothstep(.15,.65,length((uv-.5)*vec2(1.3,.8))); col=mix(col,tileInk*blackout,tile*.58*tileFocus*(1.-uServices)); col*=.35;
float grid=min(abs(fract(curved.x*48.)-.5),abs(fract(curved.y*36.)-.5)); float gridLine=1.-smoothstep(0.,.018,grid); float crossX=1.-smoothstep(.012,.025,abs(fract(curved.x*8.)-.5)); float crossY=1.-smoothstep(.012,.025,abs(fract(curved.y*6.)-.5)); float cross=crossX*crossY;
col+=vec3(.032,.048,.055)*(gridLine*.45+cross*.55); col=mix(col,vec3(.012,.023,.024)+vec3(.15,.23,.22)*(gridLine*.23+cross*.65),uServices);
float lightWipe=mix(smoothstep(uv.y-.075,uv.y+.075,uLight)*step(.001,uLight),1.,smoothstep(.96,1.,uLight)); vec3 lightCol=vec3(.76,.82,.81); col=mix(col,lightCol,lightWipe); col=mix(col,vec3(.4,.55,.53),clamp(lightWipe*(gridLine*.045+cross*.2),0.,.3));
float vignette=1.-smoothstep(.18,.82,length((uv-.5)*vec2(.9,1.))); col*=mix(mix(.55,1.,vignette),1.,uLight); col+=vec3(.22,.27,.4)*length(v)*.12;
col=mix(col,vec3(.006,.008,.012),uContact*.98); float scan=step(.996,fract(uv.y*250.)); col+=vec3(scan*.025*(1.-uContact)*(1.-uLight)); float revealMask=1.-smoothstep(uReveal*1.15,uReveal*1.15+.2,length((uv-.5)*vec2(.95,1.))); col*=revealMask; gl_FragColor=vec4(col,1.); }`;

export const refractionFragment = `precision highp float; varying vec2 vUv; varying vec3 vNormal,vWorld; uniform sampler2D uScene,uFluid; uniform samplerCube uEnv; uniform vec2 uResolution; uniform vec3 uIorRGB; uniform float uTime,uLight,uReveal,uServices,uContact,uRoughness,uNoiseScale;
float surfaceNoise(vec3 p){ return sin(p.x*uNoiseScale+sin(p.y*uNoiseScale*.63)+uTime*.2)*sin(p.y*uNoiseScale*.81+p.z*4.); }
void main(){ vec3 baseN=normalize(vNormal); vec3 N=normalize(baseN+vec3(surfaceNoise(vWorld)*.035, surfaceNoise(vWorld.yzx+3.)*.035,0.)); vec3 V=normalize(cameraPosition-vWorld); vec2 screen=gl_FragCoord.xy/uResolution; vec2 vel=texture2D(uFluid,screen).rg;
vec2 bend=N.xy*.09+vec2(surfaceNoise(vWorld),surfaceNoise(vWorld.yzx+5.))*.006+vel*.004; vec2 roughDir=normalize(N.xy+vec2(.0001)); float blur=uRoughness*(.004+abs(surfaceNoise(vWorld))*.006); vec2 d=roughDir*blur; vec3 a=texture2D(uScene,clamp(screen+bend+d,vec2(.002),vec2(.998))).rgb; vec3 b=texture2D(uScene,clamp(screen+bend-d,vec2(.002),vec2(.998))).rgb; vec3 c=texture2D(uScene,clamp(screen+bend+d.yx,vec2(.002),vec2(.998))).rgb; vec3 e=texture2D(uScene,clamp(screen+bend-d.yx,vec2(.002),vec2(.998))).rgb;
vec3 f=texture2D(uScene,clamp(screen+bend+d*1.7,vec2(.002),vec2(.998))).rgb; vec3 g=texture2D(uScene,clamp(screen+bend-d*1.7,vec2(.002),vec2(.998))).rgb; vec3 h=texture2D(uScene,clamp(screen+bend+d.yx*1.7,vec2(.002),vec2(.998))).rgb; vec3 i=texture2D(uScene,clamp(screen+bend-d.yx*1.7,vec2(.002),vec2(.998))).rgb;
vec3 softened=(a+b+c+e+f+g+h+i)*.125; vec3 rayR=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.r); vec3 rayG=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.g); vec3 rayB=mat3(viewMatrix)*refract(-V,N,1./uIorRGB.b);
vec2 offsetR=rayR.xy/max(.2,abs(rayR.z))*.11; vec2 offsetG=rayG.xy/max(.2,abs(rayG.z))*.11; vec2 offsetB=rayB.xy/max(.2,abs(rayB.z))*.11;
vec3 dispersed=vec3(texture2D(uScene,clamp(screen+offsetR+vel*.004,vec2(.002),vec2(.998))).r,texture2D(uScene,clamp(screen+offsetG+vel*.004,vec2(.002),vec2(.998))).g,texture2D(uScene,clamp(screen+offsetB+vel*.004,vec2(.002),vec2(.998))).b); vec3 refr=mix(dispersed,softened,clamp(uRoughness*3.,0.,.8));
vec3 reflected=textureCube(uEnv,reflect(-V,N)).rgb; float bands=pow(max(0.,dot(N,normalize(vec3(.05,.56,.83)))),4.)*.95+pow(max(0.,dot(N,normalize(vec3(-.72,.2,.66)))),10.)*.7; float bevelLight=pow(max(0.,dot(N,normalize(vec3(.45,-.25,.86)))),22.)*.85;
float grain=surfaceNoise(vWorld)*.035; float fresnel=pow(1.-max(dot(N,V),0.),5.); vec3 studio=max(reflected,vec3(.38,.43,.54)); vec3 color=refr*.82+studio*(.1+fresnel*.58)+vec3(.68,.78,.92)*bands+vec3(1.,.56,.3)*bevelLight+grain;
float contour=step(.58,fract((vUv.x+vUv.y)*42.)); vec3 light=vec3(.17,.78,.73); color=mix(color,light,.38*uLight*contour); color=mix(color,vec3(.84,.98,.95),uLight*.14); color*=1.+min(length(vel),1.)*.12; gl_FragColor=vec4(color,(1.-uLight*.99)*(1.-uServices*.82)*(1.-uContact)*smoothstep(0.,.45,uReveal)); }`;

export const displayFragment = `precision highp float; varying vec2 vUv; uniform float uOpacity,uTime; void main(){float bands=.5+.5*sin(vUv.y*8.+uTime*.45); vec3 c=mix(vec3(.05,.2,.28),vec3(.15,.9,.82),vUv.y*.62+bands*.12); float grid=step(.94,fract(vUv.x*12.))*.22+step(.94,fract(vUv.y*18.))*.16; c+=vec3(grid); gl_FragColor=vec4(c,uOpacity*.7);}`;

export const panelVertex = fullscreenVertex;

export const panelFragment = `precision highp float; varying vec2 vUv; uniform sampler2D uMap; uniform float uOpacity; void main(){vec2 p=(vUv-.5)*2.; float r=dot(p,p); vec2 uv=vUv+p*r*.012; vec2 d=normalize(p+vec2(.0001))*.0015; vec4 a=texture2D(uMap,clamp(uv+d,vec2(.002),vec2(.998))); vec4 b=texture2D(uMap,clamp(uv-d,vec2(.002),vec2(.998))); vec4 c=texture2D(uMap,clamp(uv+d.yx,vec2(.002),vec2(.998))); vec4 e=texture2D(uMap,clamp(uv-d.yx,vec2(.002),vec2(.998))); vec3 col=(a.rgb+b.rgb+c.rgb+e.rgb)*.17+vec3(a.r,b.g,c.b)*.32; float edge=1.-smoothstep(.72,1.12,length(p)); col*=mix(.82,1.,edge); gl_FragColor=vec4(col,uOpacity);}`;
