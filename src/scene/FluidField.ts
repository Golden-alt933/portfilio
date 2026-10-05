import * as THREE from "three";

const vertex = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.0,1.0); }`;

/** Small GPU velocity/pressure solve. Deliberately disabled on touch-sized viewports. */
export class FluidField {
  velocity: THREE.WebGLRenderTarget;
  private velocityBack: THREE.WebGLRenderTarget;
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
  private pointer = new THREE.Vector2(0.5, 0.5);
  private impulse = new THREE.Vector2();
  private enabled: boolean;
  private resolution: THREE.Vector2;

  constructor(
    private renderer: THREE.WebGLRenderer,
    width: number,
    height: number,
    enabled: boolean,
  ) {
    this.enabled = enabled;
    const w = Math.max(
      32,
      Math.min(256, Math.round(256 * Math.min(1, width / height))),
    );
    const h = Math.max(
      32,
      Math.min(256, Math.round(256 * Math.min(1, height / width))),
    );
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
    this.pressure = make();
    this.pressureBack = make();
    this.divergence = make();
    const previousTarget = renderer.getRenderTarget();
    for (const target of [
      this.velocity,
      this.velocityBack,
      this.pressure,
      this.pressureBack,
      this.divergence,
    ]) {
      renderer.setRenderTarget(target);
      renderer.clear(true, true, true);
    }
    renderer.setRenderTarget(previousTarget);
    this.velocityMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uPrev: { value: this.velocity.texture },
        uPointer: { value: this.pointer },
        uImpulse: { value: this.impulse },
        uTexel: { value: this.resolution },
        uEnabled: { value: enabled ? 1 : 0 },
      },
      vertexShader: vertex,
      fragmentShader: `precision highp float; varying vec2 vUv; uniform sampler2D uPrev; uniform vec2 uPointer,uImpulse,uTexel; uniform float uEnabled;
      void main(){ vec2 v=texture2D(uPrev,vUv).rg; vec2 back=vUv-v*uTexel*2.0; v=texture2D(uPrev,back).rg*.99;
      vec2 d=(vUv-uPointer)*vec2(1.0,uTexel.x/uTexel.y); float f=exp(-dot(d,d)/.0064); v+=uImpulse*f*30.0; gl_FragColor=vec4(clamp(v,vec2(-2.0),vec2(2.0))*uEnabled,0.0,1.0); }`,
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
    this.quad = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      this.velocityMaterial,
    );
    this.quadScene.add(this.quad);
  }

  setPointer(x: number, y: number, dx: number, dy: number) {
    this.pointer.set(x, y);
    const signedPower = (v: number) =>
      Math.sign(v) * Math.pow(Math.abs(v), 1.6);
    this.impulse.set(
      THREE.MathUtils.clamp(signedPower(dx * 2), -1, 1),
      THREE.MathUtils.clamp(signedPower(dy * 2), -1, 1),
    );
  }

  setEnabled(enabled: boolean) {
    const changed = this.enabled !== enabled;
    this.enabled = enabled;
    this.velocityMaterial.uniforms.uEnabled.value = enabled ? 1 : 0;
    if (!enabled) this.impulse.set(0, 0);
    if (changed) {
      const previous = this.renderer.getRenderTarget();
      for (const target of [
        this.velocity,
        this.velocityBack,
        this.pressure,
        this.pressureBack,
        this.divergence,
      ]) {
        this.renderer.setRenderTarget(target);
        this.renderer.clear(true, true, true);
      }
      this.renderer.setRenderTarget(previous);
    }
  }

  private pass(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget,
  ) {
    this.quad.material = material;
    this.renderer.setRenderTarget(target);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  update() {
    if (!this.enabled) return;
    const oldTarget = this.renderer.getRenderTarget();
    const oldAutoClear = this.renderer.autoClear;
    this.renderer.autoClear = false;
    this.velocityMaterial.uniforms.uPrev.value = this.velocity.texture;
    this.pass(this.velocityMaterial, this.velocityBack);
    [this.velocity, this.velocityBack] = [this.velocityBack, this.velocity];
    this.divergenceMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.pass(this.divergenceMaterial, this.divergence);
    for (let i = 0; i < 4; i++) {
      this.pressureMaterial.uniforms.uPressure.value = this.pressure.texture;
      this.pressureMaterial.uniforms.uDivergence.value =
        this.divergence.texture;
      this.pass(this.pressureMaterial, this.pressureBack);
      [this.pressure, this.pressureBack] = [this.pressureBack, this.pressure];
    }
    this.projectMaterial.uniforms.uVelocity.value = this.velocity.texture;
    this.projectMaterial.uniforms.uPressure.value = this.pressure.texture;
    this.pass(this.projectMaterial, this.velocityBack);
    [this.velocity, this.velocityBack] = [this.velocityBack, this.velocity];
    this.renderer.setRenderTarget(oldTarget);
    this.renderer.autoClear = oldAutoClear;
    this.impulse.multiplyScalar(0.5);
  }

  resize(width: number, height: number) {
    const w = Math.max(
      32,
      Math.min(256, Math.round(256 * Math.min(1, width / height))),
    );
    const h = Math.max(
      32,
      Math.min(256, Math.round(256 * Math.min(1, height / width))),
    );
    this.resolution.set(1 / w, 1 / h);
    for (const target of [
      this.velocity,
      this.velocityBack,
      this.pressure,
      this.pressureBack,
      this.divergence,
    ])
      target.setSize(w, h);
    for (const material of [
      this.velocityMaterial,
      this.divergenceMaterial,
      this.pressureMaterial,
      this.projectMaterial,
    ])
      material.uniforms.uTexel.value = this.resolution;
  }

  dispose() {
    this.velocity.dispose();
    this.velocityBack.dispose();
    this.pressure.dispose();
    this.pressureBack.dispose();
    this.divergence.dispose();
    this.quad.geometry.dispose();
    this.velocityMaterial.dispose();
    this.divergenceMaterial.dispose();
    this.pressureMaterial.dispose();
    this.projectMaterial.dispose();
  }
}
