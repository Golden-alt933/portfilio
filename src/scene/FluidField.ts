import * as THREE from "three";

const vertex = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

type Splat = {
  x: number;
  y: number;
  strength: number;
  radius: number;
  angle: number;
  color: THREE.Color;
};

/** Small GPU velocity/pressure solve plus a separate, advected pigment field. */
export class FluidField {
  velocity: THREE.WebGLRenderTarget;
  /** RGB is emissive pigment energy; alpha stores pigment density. Always allocated, including mobile mode. */
  dye: THREE.WebGLRenderTarget;
  private velocityBack: THREE.WebGLRenderTarget;
  private dyeBack: THREE.WebGLRenderTarget;
  private pressure: THREE.WebGLRenderTarget;
  private pressureBack: THREE.WebGLRenderTarget;
  private divergence: THREE.WebGLRenderTarget;
  private quadScene = new THREE.Scene();
  private quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private quad: THREE.Mesh;
  private velocityMaterial: THREE.ShaderMaterial;
  private divergenceMaterial: THREE.ShaderMaterial;
  private pressureMaterial: THREE.ShaderMaterial;
  private projectMaterial: THREE.ShaderMaterial;
  private dyeMaterial: THREE.ShaderMaterial;
  private pointer = new THREE.Vector2(0.5, 0.5);
  private impulse = new THREE.Vector2();
  private pointerColor = new THREE.Color(0x3b7bff);
  private pointerDeposit = 0;
  private enabled: boolean;
  private resolution: THREE.Vector2;
  private reveal = 0;
  private revealTime = 0;
  private splatQueue: Splat[] = [];
  private splatPositions = Array.from({ length: 8 }, () => new THREE.Vector4());
  private splatDirections = Array.from(
    { length: 8 },
    () => new THREE.Vector2(),
  );
  private splatColors = Array.from({ length: 8 }, () => new THREE.Color());

  constructor(
    private renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    enabled: boolean,
  ) {
    this.enabled = enabled;
    const [w, h] = this.dimensions(width, height);
    this.resolution = new THREE.Vector2(1 / w, 1 / h);
    const make = () =>
      new THREE.WebGLRenderTarget(w, h, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        format: THREE.RGBAFormat,
        type: THREE.HalfFloatType,
        depthBuffer: false,
        stencilBuffer: false,
      });
    this.velocity = make();
    this.velocityBack = make();
    this.dye = make();
    this.dyeBack = make();
    this.pressure = make();
    this.pressureBack = make();
    this.divergence = make();

    const targets = [
      this.velocity,
      this.velocityBack,
      this.dye,
      this.dyeBack,
      this.pressure,
      this.pressureBack,
      this.divergence,
    ];
    const oldTarget = renderer.getRenderTarget();
    const oldAutoClear = renderer.autoClear;
    try {
      for (const target of targets) {
        renderer.setRenderTarget(target);
        renderer.clear(true, true, true);
      }
    } finally {
      renderer.setRenderTarget(oldTarget);
      renderer.autoClear = oldAutoClear;
    }

    this.velocityMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: this.velocity.texture },
        uPointer: { value: this.pointer },
        uImpulse: { value: this.impulse },
        uTexel: { value: this.resolution },
        uEnabled: { value: enabled ? 1 : 0 },
        uDt: { value: 1 / 60 },
      },
      vertexShader: vertex,
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uPrev; uniform vec2 uPointer,uImpulse,uTexel; uniform float uEnabled,uDt;
      void main(){ vec2 v=texture2D(uPrev,vUv).rg; vec2 back=vUv-v*uTexel*(uDt*60.0); v=texture2D(uPrev,back).rg*pow(.99,uDt*60.0);
      // Pointer splat after the reference: a tiny radius that grows with
      // pointer speed (1%..6% of the frame) and a force of 30x, clamped.
      float aspect=uTexel.y/uTexel.x; vec2 d=vUv-uPointer; if(aspect<1.0){ d.x*=aspect; } else { d.y/=aspect; }
      float pv=smoothstep(0.01,1.0,length(uImpulse));
      float w=smoothstep(0.01+0.1*min(0.5,pv),0.0,length(d));
      vec2 power=uImpulse*30.0; if(aspect<1.0){ power.x/=aspect; } else { power.y*=aspect; }
      power=clamp(power,vec2(-2.0),vec2(2.0));
      v+=w*power;
      // Vorticity confinement (curl 0.02, as the reference) keeps it swirling.
      vec2 tx=vec2(uTexel.x,0.0), ty=vec2(0.0,uTexel.y);
      float cC=texture2D(uPrev,vUv+tx).y-texture2D(uPrev,vUv-tx).y-texture2D(uPrev,vUv+ty).x+texture2D(uPrev,vUv-ty).x;
      float cL=texture2D(uPrev,vUv).y-texture2D(uPrev,vUv-2.0*tx).y-texture2D(uPrev,vUv-tx+ty).x+texture2D(uPrev,vUv-tx-ty).x;
      float cR=texture2D(uPrev,vUv+2.0*tx).y-texture2D(uPrev,vUv).y-texture2D(uPrev,vUv+tx+ty).x+texture2D(uPrev,vUv+tx-ty).x;
      float cB=texture2D(uPrev,vUv+tx-ty).y-texture2D(uPrev,vUv-tx-ty).y-texture2D(uPrev,vUv).x+texture2D(uPrev,vUv-2.0*ty).x;
      float cT=texture2D(uPrev,vUv+tx+ty).y-texture2D(uPrev,vUv-tx+ty).y-texture2D(uPrev,vUv+2.0*ty).x+texture2D(uPrev,vUv).x;
      vec2 force=0.5*vec2(abs(cT)-abs(cB),abs(cR)-abs(cL)); force/=length(force)+0.0001; force*=0.02*cC; force.y*=-1.0;
      v+=force*(uDt*60.0);
      gl_FragColor=vec4(clamp(v,vec2(-2.0),vec2(2.0))*uEnabled,0.0,1.0); }`,
    });
    this.divergenceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uVelocity: { value: this.velocity.texture },
        uTexel: { value: this.resolution },
      },
      vertexShader: vertex,
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uVelocity; uniform vec2 uTexel; void main(){ float l=texture2D(uVelocity,vUv-vec2(uTexel.x,0.)).x; float r=texture2D(uVelocity,vUv+vec2(uTexel.x,0.)).x; float b=texture2D(uVelocity,vUv-vec2(0.,uTexel.y)).y; float t=texture2D(uVelocity,vUv+vec2(0.,uTexel.y)).y; gl_FragColor=vec4((r-l+t-b)*.5,0.,0.,1.); }`,
    });
    this.pressureMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPressure: { value: this.pressure.texture },
        uDivergence: { value: this.divergence.texture },
        uTexel: { value: this.resolution },
      },
      vertexShader: vertex,
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uPressure,uDivergence; uniform vec2 uTexel; void main(){ float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r; float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r; float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r; float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r; float d=texture2D(uDivergence,vUv).r; gl_FragColor=vec4((l+r+b+t-d)*.25,0.,0.,1.); }`,
    });
    this.projectMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uVelocity: { value: this.velocity.texture },
        uPressure: { value: this.pressure.texture },
        uTexel: { value: this.resolution },
      },
      vertexShader: vertex,
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uVelocity,uPressure; uniform vec2 uTexel; void main(){ vec2 v=texture2D(uVelocity,vUv).rg; float l=texture2D(uPressure,vUv-vec2(uTexel.x,0.)).r; float r=texture2D(uPressure,vUv+vec2(uTexel.x,0.)).r; float b=texture2D(uPressure,vUv-vec2(0.,uTexel.y)).r; float t=texture2D(uPressure,vUv+vec2(0.,uTexel.y)).r; gl_FragColor=vec4(v-vec2(r-l,t-b)*.5,0.,1.); }`,
    });
    this.dyeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uDye: { value: this.dye.texture },
        uVelocity: { value: this.velocity.texture },
        uTexel: { value: this.resolution },
        uPointer: { value: this.pointer },
        uColor: { value: this.pointerColor },
        uDeposit: { value: 0 },
        uDt: { value: 1 / 60 },
        uTime: { value: 0 },
        uSplats: { value: this.splatPositions },
        uSplatDirections: { value: this.splatDirections },
        uSplatColors: { value: this.splatColors },
        uSplatCount: { value: 0 },
      },
      vertexShader: vertex,
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uDye,uVelocity; uniform vec2 uTexel,uPointer; uniform vec3 uColor; uniform float uDeposit,uDt,uTime,uSplatCount; uniform vec4 uSplats[8]; uniform vec2 uSplatDirections[8]; uniform vec3 uSplatColors[8];
      void main(){
        vec2 velocity=texture2D(uVelocity,vUv).rg;
        vec2 drift=vec2(sin(vUv.y*8.0+uTime*.42),cos(vUv.x*7.0-uTime*.35))*.00075;
        vec2 backUv=clamp(vUv-velocity*uTexel*2.0*(uDt*60.0)-drift*(uDt*60.0),vec2(.001),vec2(.999));
        vec4 pigment=texture2D(uDye,backUv)*exp(-uDt*.72);
        vec2 pd=(vUv-uPointer)*vec2(1.0,uTexel.x/uTexel.y);
        float pointerBlob=exp(-dot(pd,pd)/.0007)*uDeposit;
        pigment.rgb+=uColor*pointerBlob*.26;
        pigment.a+=pointerBlob*.48;
        for(int i=0;i<8;i++){ if(float(i)<uSplatCount){
          vec4 s=uSplats[i]; vec2 d=(vUv-s.xy)*vec2(1.0,uTexel.x/uTexel.y); vec2 dir=normalize(uSplatDirections[i]+vec2(.0001));
          vec2 local=vec2(dir.x*d.x+dir.y*d.y,-dir.y*d.x+dir.x*d.y);
          float theta=atan(local.y,local.x); float seed=fract(sin(dot(s.xy,vec2(127.1,311.7)))*43758.5453);
          float edgeNoise=sin(theta*8.0+seed*6.28318)*.5+sin(theta*13.0-seed*4.1)*.25;
          float plumeRadius=s.w*(1.0+.16*edgeNoise);
          float tongue=exp(-(local.x*local.x/(plumeRadius*plumeRadius*7.0)+local.y*local.y/(plumeRadius*plumeRadius*.20)));
          float lobe=pow(max(0.0,.5+.5*cos(theta*2.0+seed*6.28318)),2.0);
          float mainBlob=tongue*(.50+.50*lobe);
          vec2 tip=dir*s.w*1.55; vec2 sideTip=(dir*.68+vec2(-dir.y,dir.x)*.62)*s.w*1.25;
          float satellites=exp(-dot(d-tip,d-tip)/(s.w*s.w*.085))*.28+exp(-dot(d-sideTip,d-sideTip)/(s.w*s.w*.055))*.16;
          float blob=(mainBlob+satellites)*s.z;
          pigment.rgb+=uSplatColors[i]*blob*.48; pigment.a+=blob*.55;
        } }
        pigment.rgb=clamp(pigment.rgb,vec3(0.0),vec3(4.0)); pigment.a=clamp(pigment.a,0.0,1.0); gl_FragColor=pigment;
      }`,
    });
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.velocityMaterial,
    );
    this.quadScene.add(this.quad);
  }

  private dimensions(width: number, height: number): [number, number] {
    const safeWidth = Math.max(1, width);
    const safeHeight = Math.max(1, height);
    return [
      Math.max(
        32,
        Math.min(256, Math.round(256 * Math.min(1, safeWidth / safeHeight))),
      ),
      Math.max(
        32,
        Math.min(256, Math.round(256 * Math.min(1, safeHeight / safeWidth))),
      ),
    ];
  }

  setPointer(x: number, y: number, dx: number, dy: number) {
    this.pointer.set(
      THREE.MathUtils.clamp(x, 0, 1),
      THREE.MathUtils.clamp(y, 0, 1),
    );
    const signedPower = (v: number) =>
      Math.sign(v) * Math.pow(Math.abs(v), 1.6);
    // Accumulates and halves every update, like the reference's pointer vector.
    this.impulse.set(
      THREE.MathUtils.clamp(this.impulse.x + signedPower(dx * 2), -1, 1),
      THREE.MathUtils.clamp(this.impulse.y + signedPower(dy * 2), -1, 1),
    );
    this.pointerDeposit = Math.min(1, Math.hypot(dx, dy) * 22);
    this.pointerColor.setHSL(0.5 + ((x * 0.1 + y * 0.06 + 1) % 1) * 0.14, 0.86, 0.6);
  }

  setEnabled(enabled: boolean) {
    const changed = this.enabled !== enabled;
    this.enabled = enabled;
    this.velocityMaterial.uniforms.uEnabled.value = enabled ? 1 : 0;
    if (!enabled) {
      this.impulse.set(0, 0);
      this.pointerDeposit = 0;
    }
    if (changed)
      this.clearTargets([
        this.velocity,
        this.velocityBack,
        this.pressure,
        this.pressureBack,
        this.divergence,
      ]);
  }

  /** Queue a small pigment burst at normalized coordinates; dye transport follows the velocity field. */
  splat(x: number, y: number, dx: number, dy: number, strength = 1) {
    const angle = Math.atan2(dy, dx);
    // Blue-to-teal range only (no purple), matching the scene palette.
    const hue = 0.5 + ((x * 0.09 + y * 0.05 + angle * 0.012 + 1) % 1) * 0.14;
    const amount = THREE.MathUtils.clamp(strength, 0.1, 2);
    this.splatQueue.push({
      x: THREE.MathUtils.clamp(x, 0.02, 0.98),
      y: THREE.MathUtils.clamp(y, 0.02, 0.98),
      strength: amount,
      radius: 0.028 + amount * 0.014,
      angle,
      color: new THREE.Color().setHSL(hue, 0.9, 0.59),
    });
    if (this.splatQueue.length > 32) this.splatQueue.shift();
    if (this.enabled) {
      this.pointer.set(x, y);
      this.impulse
        .add(new THREE.Vector2(dx, dy).multiplyScalar(0.18 * amount))
        .clampLength(0, 1);
    }
  }

  /** Normalized reveal; emits a seeded cluster once while the intro crosses 0.07–0.62. */
  setReveal(value: number) {
    // The reference has no ink burst on load; the reveal is purely optical.
    this.reveal = THREE.MathUtils.clamp(value, 0, 1);
  }
  private pass(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget,
  ) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  private clearTargets(targets: THREE.WebGLRenderTarget[]) {
    const previous = this.renderer.getRenderTarget();
    const autoClear = this.renderer.autoClear;
    try {
      for (const target of targets) {
        this.renderer.setRenderTarget(target);
        this.renderer.clear(true, true, true);
      }
    } finally {
      this.renderer.setRenderTarget(previous);
      this.renderer.autoClear = autoClear;
    }
  }

  update(dt = 1 / 60) {
    const frameDt = THREE.MathUtils.clamp(
      Number.isFinite(dt) ? dt : 1 / 60,
      1 / 240,
      1 / 20,
    );
    const oldTarget = this.renderer.getRenderTarget();
    const oldAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    try {
      if (this.enabled) {
        this.velocityMaterial.uniforms.uDt.value = frameDt;
        this.velocityMaterial.uniforms.uPrev.value = this.velocity.texture;
        this.pass(this.velocityMaterial, this.velocityBack);
        [this.velocity, this.velocityBack] = [this.velocityBack, this.velocity];
        this.impulse.multiplyScalar(0.5);
        this.divergenceMaterial.uniforms.uVelocity.value =
          this.velocity.texture;
        this.pass(this.divergenceMaterial, this.divergence);
        for (let i = 0; i < 4; i++) {
          this.pressureMaterial.uniforms.uPressure.value =
            this.pressure.texture;
          this.pressureMaterial.uniforms.uDivergence.value =
            this.divergence.texture;
          this.pass(this.pressureMaterial, this.pressureBack);
          [this.pressure, this.pressureBack] = [
            this.pressureBack,
            this.pressure,
          ];
        }
        this.projectMaterial.uniforms.uVelocity.value = this.velocity.texture;
        this.projectMaterial.uniforms.uPressure.value = this.pressure.texture;
        this.pass(this.projectMaterial, this.velocityBack);
        [this.velocity, this.velocityBack] = [this.velocityBack, this.velocity];
      }

      const activeSplats = Math.min(8, this.splatQueue.length);
      for (let i = 0; i < 8; i++) {
        const splat = i < activeSplats ? this.splatQueue[i] : undefined;
        if (splat) {
          this.splatPositions[i].set(
            splat.x,
            splat.y,
            splat.strength,
            splat.radius,
          );
          this.splatDirections[i].set(
            Math.cos(splat.angle),
            Math.sin(splat.angle),
          );
          this.splatColors[i].copy(splat.color);
        } else {
          this.splatPositions[i].set(0, 0, 0, 0.02);
          this.splatDirections[i].set(1, 0);
          this.splatColors[i].setRGB(0, 0, 0);
        }
      }
      if (activeSplats) this.splatQueue.splice(0, activeSplats);
      this.dyeMaterial.uniforms.uDye.value = this.dye.texture;
      this.dyeMaterial.uniforms.uVelocity.value = this.velocity.texture;
      this.dyeMaterial.uniforms.uDeposit.value = this.pointerDeposit;
      this.dyeMaterial.uniforms.uDt.value = frameDt;
      this.dyeMaterial.uniforms.uTime.value += frameDt;
      if (this.reveal >= 0.015 && this.reveal <= 0.62)
        this.revealTime += frameDt;
      this.dyeMaterial.uniforms.uSplatCount.value = activeSplats;
      this.pass(this.dyeMaterial, this.dyeBack);
      [this.dye, this.dyeBack] = [this.dyeBack, this.dye];
      this.dyeMaterial.uniforms.uDye.value = this.dye.texture;
    } finally {
      this.renderer.setRenderTarget(oldTarget);
      this.renderer.autoClear = oldAutoClear;
    }
    this.pointerDeposit = 0;
    this.impulse.multiplyScalar(Math.pow(0.5, frameDt * 60));
  }

  resize(width: number, height: number) {
    const [w, h] = this.dimensions(width, height);
    this.resolution.set(1 / w, 1 / h);
    const targets = [
      this.velocity,
      this.velocityBack,
      this.dye,
      this.dyeBack,
      this.pressure,
      this.pressureBack,
      this.divergence,
    ];
    for (const target of targets) target.setSize(w, h);
    for (const material of [
      this.velocityMaterial,
      this.divergenceMaterial,
      this.pressureMaterial,
      this.projectMaterial,
      this.dyeMaterial,
    ]) {
      material.uniforms.uTexel.value = this.resolution;
    }
    this.clearTargets(targets);
  }

  dispose() {
    this.velocity.dispose();
    this.velocityBack.dispose();
    this.dye.dispose();
    this.dyeBack.dispose();
    this.pressure.dispose();
    this.pressureBack.dispose();
    this.divergence.dispose();
    this.quad.geometry.dispose();
    this.velocityMaterial.dispose();
    this.divergenceMaterial.dispose();
    this.pressureMaterial.dispose();
    this.projectMaterial.dispose();
    this.dyeMaterial.dispose();
    this.splatQueue.length = 0;
  }
}
