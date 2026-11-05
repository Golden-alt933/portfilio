import * as THREE from "three";
import {
  serviceBackdropFragment,
  serviceBackdropVertex,
  serviceGridFragment,
  serviceSheetVertex,
  serviceThumbFragment,
} from "./shaders";

export type ServiceMedia = { texture: THREE.Texture | null; aspect: number; isVideo: boolean };

/**
 * Separate services scene, rendered to its own target (as in the reference):
 * a grid sheet with drifting crosses and three thumbnails that slide as a
 * carousel along one sine-bent sheet. The R's side screen reveals this target
 * and the final composite switches to it once the turn completes.
 */
export class ServiceScene {
  readonly target: THREE.WebGLRenderTarget;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
  private grid: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private backdrop: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private thumbs: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>[] = [];
  private common = {
    uServiceIn: { value: 0 },
    uTime: { value: 0 },
    uScroll: { value: 1 },
    uFull: { value: 0 },
    uScale: { value: new THREE.Vector2(1, 1) },
    uWave: { value: 1 },
    uOffsetX: { value: 0 },
  };

  constructor(count: number) {
    this.target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
    });
    this.target.texture.colorSpace = THREE.NoColorSpace;
    this.scene.background = new THREE.Color(0x07090a);
    this.camera.position.set(0, 0, 10);
    this.camera.lookAt(0, 0, 0);

    this.grid = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 64, 64),
      new THREE.ShaderMaterial({
        uniforms: {
          ...this.common,
          uId: { value: 0 },
          uIsLast: { value: 0 },
          uOpacity: { value: 1 },
          uGrid: { value: new THREE.Vector2(75, 50) },
        },
        vertexShader: serviceSheetVertex,
        fragmentShader: serviceGridFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.grid.renderOrder = -1;
    this.scene.add(this.grid);
    this.backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(2, 2),
      new THREE.ShaderMaterial({
        uniforms: {
          uMap: { value: null },
          uOpacity: { value: 0.22 },
          uIsVideo: { value: 0 },
          uMediaAspect: { value: 16 / 9 },
          uScreenAspect: { value: 16 / 9 },
          uTime: { value: 0 },
        },
        vertexShader: serviceBackdropVertex,
        fragmentShader: serviceBackdropFragment,
        transparent: true,
        depthWrite: false,
        depthTest: false,
      }),
    );
    this.backdrop.frustumCulled = false;
    this.backdrop.renderOrder = -2;
    this.scene.add(this.backdrop);

    for (let i = 0; i < count; i++) {
      const thumb = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1, 24, 12),
        new THREE.ShaderMaterial({
          uniforms: {
            ...this.common,
            uId: { value: i },
            uIsLast: { value: i === count - 1 ? 1 : 0 },
            uOpacity: { value: 1 },
            uMap: { value: null },
            uIsVideo: { value: 0 },
            uMediaAspect: { value: 16 / 9 },
            uScreenAspect: { value: 16 / 9 },
          },
          defines: { IS_THUMB: "" },
          vertexShader: serviceSheetVertex,
          fragmentShader: serviceThumbFragment,
          transparent: true,
          depthWrite: false,
          depthTest: false,
        }),
      );
      // Later (right-hand) thumbnails draw over earlier ones; the last one
      // draws on top when it wipes to full frame.
      thumb.renderOrder = i;
      this.thumbs.push(thumb);
      this.scene.add(thumb);
    }
  }

  setSize(width: number, height: number, pixelRatio: number) {
    this.target.setSize(Math.max(1, Math.round(width * pixelRatio)), Math.max(1, Math.round(height * pixelRatio)));
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    const viewH = 2 * this.camera.position.z * Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const viewW = viewH * this.camera.aspect;
    const size = Math.max(viewW, viewH);
    this.common.uScale.value.set(size, size);
    // Depth wave relative to the sheet, matching the reference's proportion.
    this.common.uWave.value = size * 0.22;
    // Desktop: the active screen sits left of the copy; phones stay centred.
    this.common.uOffsetX.value = width < 900 ? 0 : -0.35;
    for (const thumb of this.thumbs)
      thumb.material.uniforms.uScreenAspect.value = width / Math.max(1, height);
    this.backdrop.material.uniforms.uScreenAspect.value = width / Math.max(1, height);
  }

  update(state: {
    time: number;
    serviceIn: number;
    scroll: number;
    full: number;
    opacity: number;
    media: ServiceMedia[];
  }) {
    this.common.uTime.value = state.time;
    this.common.uServiceIn.value = state.serviceIn;
    this.common.uScroll.value = state.scroll;
    this.common.uFull.value = state.full;
    this.grid.material.uniforms.uOpacity.value = state.opacity;
    // Active service plays faintly behind the grid.
    const active = Math.max(0, Math.min(state.media.length - 1, Math.round(state.scroll) - 1));
    const backdropMedia = state.media[active];
    const b = this.backdrop.material.uniforms;
    b.uMap.value = backdropMedia?.texture ?? null;
    b.uIsVideo.value = backdropMedia?.isVideo ? 1 : 0;
    b.uMediaAspect.value = backdropMedia?.aspect ?? 16 / 9;
    b.uOpacity.value = 0.24 * state.opacity * Math.min(1, state.serviceIn * 1.5);
    this.backdrop.visible = !!backdropMedia?.texture;
    this.thumbs.forEach((thumb, i) => {
      const media = state.media[i];
      const u = thumb.material.uniforms;
      u.uOpacity.value = state.opacity * Math.min(1, state.serviceIn * 3);
      u.uMap.value = media?.texture ?? null;
      u.uIsVideo.value = media?.isVideo ? 1 : 0;
      u.uMediaAspect.value = media?.aspect ?? 16 / 9;
      thumb.visible = !!media?.texture;
    });
  }

  render(renderer: THREE.WebGLRenderer) {
    renderer.setRenderTarget(this.target);
    renderer.clear(true, true, true);
    renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.target.dispose();
    this.grid.geometry.dispose();
    this.grid.material.dispose();
    this.backdrop.geometry.dispose();
    this.backdrop.material.dispose();
    for (const thumb of this.thumbs) {
      thumb.geometry.dispose();
      thumb.material.dispose();
    }
  }
}
