import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Project } from "./content";
import type { SceneState } from "./SceneState";
import { FluidField } from "./scene/FluidField";
import { SceneChoreography } from "./scene/choreography";
import {
  backgroundFragment,
  displayFragment,
  fullscreenVertex,
  panelFragment,
  panelVertex,
  refractionFragment,
  refractionVertex,
} from "./scene/shaders";

type Props = {
  state: React.RefObject<SceneState>;
  reducedMotion: boolean;
  active?: boolean;
  onReady: (ready: boolean) => void;
  onFailure?: () => void;
  projects: Project[];
  onSelect: (slug: string) => void;
};

function drawPoster(project: Project, canvas: HTMLCanvasElement) {
  canvas.width = 1200;
  canvas.height = 760;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const palette: Record<string, [string, string]> = {
    silver: ["#d7d7d2", "#20201f"],
    blue: ["#9fc6e9", "#06142a"],
    olive: ["#b6bf87", "#182014"],
    terminal: ["#0d1713", "#c9ffb0"],
    violet: ["#aaa0e9", "#1b123b"],
    slate: ["#b8c5d0", "#14232d"],
  };
  const [base, ink] = palette[project.tone] || palette.silver;
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.translate(760, 370);
  ctx.rotate(-0.16);
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.13;
  ctx.lineWidth = 2;
  for (let i = -700; i < 700; i += 26) {
    ctx.beginPath();
    ctx.moveTo(i, -520);
    ctx.lineTo(i + 520, 520);
    ctx.stroke();
  }
  ctx.restore();
  ctx.globalAlpha = 1;
  ctx.fillStyle = ink;
  ctx.font = "500 22px 'IBM Plex Mono', monospace";
  ctx.fillText(`${project.number} / SELECTED WORK`, 72, 78);
  ctx.globalAlpha = 0.16;
  ctx.font = "700 360px Inter, Arial, sans-serif";
  ctx.fillText(project.previewTitle, 55, 440);
  ctx.globalAlpha = 1;
  ctx.font = "700 112px Inter, Arial, sans-serif";
  ctx.fillText(project.previewTitle, 72, 405);
  ctx.font = "700 82px Inter, Arial, sans-serif";
  ctx.fillText(project.previewSubtitle, 72, 500);
  ctx.font = "400 20px 'IBM Plex Mono', monospace";
  ctx.fillText(project.title.toUpperCase(), 76, 690);
  ctx.textAlign = "right";
  ctx.fillText(
    project.category === "video" ? "MOTION / FILM" : "DIGITAL / CODE",
    1124,
    690,
  );
  ctx.textAlign = "left";
  ctx.strokeStyle = ink;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 1;
  ctx.strokeRect(38, 38, 1124, 684);
}

function wordmarkTexture(text: string, canvas: HTMLCanvasElement) {
  canvas.width = 2048;
  canvas.height = 520;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font =
    text === "CREATE"
      ? "700 430px Inter, Arial, sans-serif"
      : "700 240px Inter, Arial, sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText(text, 1024, 260, 1900);
}

function makeCanvasTexture(canvas: HTMLCanvasElement) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export default function HeroScene({
  state,
  reducedMotion,
  active = true,
  onReady,
  onFailure,
  projects,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const reducedRef = useRef(reducedMotion);
  reducedRef.current = reducedMotion;
  const activeRef = useRef(active);
  activeRef.current = active;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const failureRef = useRef(onFailure);
  failureRef.current = onFailure;
  const projectsRef = useRef(projects);
  projectsRef.current = projects;
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    const holder = container.current;
    if (!holder) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        preserveDrawingBuffer: false,
      });
    } catch {
      holder.dataset.rendererStatus = "fallback";
      readyRef.current(false);
      failureRef.current?.();
      return;
    }
    holder.dataset.rendererStatus = "loading";
    let shaderFailed = false;
    renderer.debug.onShaderError = (gl, program) => {
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) return;
      shaderFailed = true;
      holder.dataset.rendererStatus = "fallback";
      holder.classList.remove("scene-ready");
      readyRef.current(false);
      failureRef.current?.();
    };
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    renderer.domElement.style.cssText =
      "position:absolute;inset:0;width:100%;height:100%;display:block;pointer-events:none";
    holder.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
    camera.position.set(0, 0, 10.5);
    const bgScene = new THREE.Scene();
    const bgCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    bgCamera.position.z = 2;
    const backgroundTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    backgroundTarget.texture.colorSpace = THREE.SRGBColorSpace;
    scene.background = backgroundTarget.texture;
    const fluid = new FluidField(
      renderer,
      window.innerWidth,
      window.innerHeight,
      window.innerWidth > 700,
    );

    const bgGeometry = new THREE.PlaneGeometry(2, 2);
    const bgMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uFluid: { value: fluid.velocity.texture },
        uLight: { value: 0 },
        uContact: { value: 0 },
        uReveal: { value: 0 },
        uServices: { value: 0 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: backgroundFragment,
      depthWrite: false,
      depthTest: false,
    });
    const bgMesh = new THREE.Mesh(bgGeometry, bgMaterial);
    bgScene.add(bgMesh);

    // Original oversized type is intentionally part of the sampled scene so the R bends it optically.
    const createCanvas = document.createElement("canvas");
    wordmarkTexture("CREATE", createCanvas);
    const createTexture = makeCanvasTexture(createCanvas);
    const typeMat = new THREE.MeshBasicMaterial({
      map: createTexture,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      toneMapped: false,
    });
    const typePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.94, 0.53),
      typeMat,
    );
    typePlane.position.set(0, 0.04, -3.5);
    bgScene.add(typePlane);

    // Capture an original procedural studio environment once for a stable reflection source.
    const room = new RoomEnvironment();
    const cubeTarget = new THREE.WebGLCubeRenderTarget(128, {
      type: THREE.HalfFloatType,
      generateMipmaps: true,
      minFilter: THREE.LinearMipmapLinearFilter,
    });
    const cubeCamera = new THREE.CubeCamera(0.1, 40, cubeTarget);
    cubeCamera.update(renderer, room);
    const envMap = cubeTarget.texture;
    room.dispose();

    // R is an original extruded outline with a real aperture and beveled edges.
    const shape = new THREE.Shape();
    shape.moveTo(-1.42, -2.05);
    shape.lineTo(-1.42, 2.05);
    shape.lineTo(0.08, 2.05);
    shape.bezierCurveTo(1.2, 2.05, 1.62, 1.5, 1.62, 0.76);
    shape.bezierCurveTo(1.62, 0.16, 1.28, -0.27, 0.72, -0.49);
    shape.lineTo(1.72, -2.05);
    shape.lineTo(0.58, -2.05);
    shape.lineTo(-0.24, -0.73);
    shape.lineTo(-0.57, -0.73);
    shape.lineTo(-0.57, -2.05);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-0.57, 1.22);
    hole.lineTo(-0.57, 0.18);
    hole.lineTo(0.06, 0.18);
    hole.bezierCurveTo(0.79, 0.18, 0.86, 1.22, 0.06, 1.22);
    hole.closePath();
    shape.holes.push(hole);
    const rGeometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.48,
      bevelEnabled: true,
      bevelThickness: 0.075,
      bevelSize: 0.06,
      bevelSegments: 5,
      curveSegments: 28,
    });
    rGeometry.computeBoundingBox();
    const geometryCenter = rGeometry.boundingBox!.getCenter(
      new THREE.Vector3(),
    );
    rGeometry.center();
    const rMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: backgroundTarget.texture },
        uEnv: { value: envMap },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uFluid: { value: fluid.velocity.texture },
        uTime: { value: 0 },
        uLight: { value: 0 },
        uReveal: { value: 0 },
        uServices: { value: 0 },
        uRoughness: { value: 0.1 },
        uContact: { value: 0 },
        uNoiseScale: { value: 9 },
        uIorRGB: { value: new THREE.Vector3(1.54, 1.51, 1.48) },
        uDepthScale: { value: 0.035 },
        uRipple: { value: 0 },
      },
      vertexShader: refractionVertex,
      fragmentShader: refractionFragment,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    });
    const letter = new THREE.Mesh(rGeometry, rMaterial);
    scene.add(letter);
    // A smooth bevel has no sharp edges for EdgesGeometry to detect. Trace the
    // actual front contour, including the aperture, so the pale chapters retain
    // one complete R silhouette rather than isolated corner fragments.
    const outlineVertices: number[] = [];
    for (const contour of [shape, ...shape.holes]) {
      const points = contour.getPoints(72);
      for (let index = 0; index < points.length; index++) {
        const a = points[index],
          b = points[(index + 1) % points.length];
        outlineVertices.push(
          a.x - geometryCenter.x,
          a.y - geometryCenter.y,
          0.34,
          b.x - geometryCenter.x,
          b.y - geometryCenter.y,
          0.34,
        );
      }
    }
    const outlineGeometry = new THREE.BufferGeometry();
    outlineGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(outlineVertices, 3),
    );
    const outlineMaterial = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });
    const outline = new THREE.LineSegments(outlineGeometry, outlineMaterial);
    outline.renderOrder = 3;
    letter.add(outline);
    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: { uOpacity: { value: 0 }, uTime: { value: 0 } },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: fullscreenVertex,
      fragmentShader: displayFragment,
    });
    const displayPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.48, 1.52),
      displayMaterial,
    );
    displayPlane.position.set(-0.98, 0.15, 0.34);
    displayPlane.renderOrder = 2;
    letter.add(displayPlane);

    const contactCanvas = document.createElement("canvas");
    wordmarkTexture("R", contactCanvas);
    const contactTexture = makeCanvasTexture(contactCanvas);
    const contactMat = new THREE.MeshBasicMaterial({
      map: contactTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const contactPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(5.8, 1.48),
      contactMat,
    );
    contactPlane.position.set(0, 0, -1.6);
    scene.add(contactPlane);

    let disposed = false;
    const loadedTextures: THREE.Texture[] = [];
    const posterCanvases: HTMLCanvasElement[] = [];
    const posters: THREE.Texture[] = [];
    const panels: THREE.Mesh[] = [];
    for (let i = 0; i < projectsRef.current.length; i++) {
      const p = projectsRef.current[i];
      if (!p) break;
      const poster = document.createElement("canvas");
      drawPoster(p, poster);
      posterCanvases.push(poster);
      const tex = makeCanvasTexture(poster);
      posters.push(tex);
      if (p.posterUrl) {
        const loader = new THREE.TextureLoader();
        loader.load(
          p.posterUrl,
          (loaded) => {
            if (disposed) {
              loaded.dispose();
              return;
            }
            loadedTextures.push(loaded);
            loaded.colorSpace = THREE.SRGBColorSpace;
            loaded.anisotropy = 4;
            const material = panels[i]?.material as
              | THREE.ShaderMaterial
              | undefined;
            if (material) {
              material.uniforms.uMap.value = loaded;
              material.needsUpdate = true;
            }
          },
          undefined,
          () => {
            /* The generated poster remains as a local fallback. */
          },
        );
      }
      const geo = new THREE.PlaneGeometry(5.5, 2.6, 36, 24);
      const pos = geo.attributes.position as THREE.BufferAttribute;
      for (let j = 0; j < pos.count; j++) {
        const x = pos.getX(j);
        pos.setZ(j, -0.18 * Math.cos((x / 5.5) * Math.PI));
      }
      geo.computeVertexNormals();
      const mat = new THREE.ShaderMaterial({
        uniforms: { uMap: { value: tex }, uOpacity: { value: 0 } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        vertexShader: panelVertex,
        fragmentShader: panelFragment,
      });
      const panel = new THREE.Mesh(geo, mat);
      panel.userData.slug = p.slug;
      panel.userData.baseIndex = i;
      panel.visible = false;
      scene.add(panel);
      panels.push(panel);
    }
    void document.fonts?.ready.then(() => {
      if (disposed) return;
      wordmarkTexture("CREATE", createCanvas);
      createTexture.needsUpdate = true;
      wordmarkTexture("R", contactCanvas);
      contactTexture.needsUpdate = true;
      for (let i = 0; i < posterCanvases.length; i++) {
        const project = projectsRef.current[i];
        if (project) {
          drawPoster(project, posterCanvases[i]);
          posters[i].needsUpdate = true;
        }
      }
    });

    const serviceMaterial = new THREE.MeshBasicMaterial({
      map: posters[0],
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const serviceGeometry = new THREE.PlaneGeometry(4.7, 3.1, 24, 18);
    const servicePositions = serviceGeometry.attributes
      .position as THREE.BufferAttribute;
    for (let index = 0; index < servicePositions.count; index++)
      servicePositions.setZ(
        index,
        -0.12 * Math.cos((servicePositions.getX(index) / 4.7) * Math.PI),
      );
    serviceGeometry.computeVertexNormals();
    const servicePortal = new THREE.Mesh(serviceGeometry, serviceMaterial);
    servicePortal.position.set(-2.45, 0.25, 1.4);
    servicePortal.rotation.y = 0.24;
    scene.add(servicePortal);

    const pointer = {
      x: 0.5,
      y: 0.5,
      px: 0.5,
      py: 0.5,
      dx: 0,
      dy: 0,
      ndcX: 0,
      ndcY: 0,
      down: -1,
      downX: 0,
      downY: 0,
      downTarget: null as THREE.Object3D | null,
    };
    const raycaster = new THREE.Raycaster();
    const pointerMove = (event: PointerEvent) => {
      if (
        !activeRef.current ||
        event.pointerType !== "mouse" ||
        reducedRef.current
      )
        return;
      const rect = holder!.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      pointer.dx = x - pointer.px;
      pointer.dy = pointer.py - y;
      pointer.px = pointer.x = x;
      pointer.py = pointer.y = y;
      pointer.ndcX = x * 2 - 1;
      pointer.ndcY = 1 - y * 2;
      if (window.innerWidth > 700)
        fluid.setPointer(x, 1 - y, pointer.dx, pointer.dy);
    };
    const interactiveTarget = (target: EventTarget | null) =>
      target instanceof Element &&
      !!target.closest(
        "a,button,input,textarea,select,[role=button],[data-scene-ignore]",
      );
    const panelHit = (event: PointerEvent) => {
      if (!activeRef.current || interactiveTarget(event.target)) return null;
      const rect = holder!.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        return null;
      raycaster.setFromCamera(
        new THREE.Vector2(
          ((event.clientX - rect.left) / rect.width) * 2 - 1,
          1 - ((event.clientY - rect.top) / rect.height) * 2,
        ),
        camera,
      );
      return (
        raycaster.intersectObjects(
          panels.filter(
            (panel) => panel.visible && panel.userData.opacity > 0.25,
          ),
          false,
        )[0]?.object || null
      );
    };
    const pointerDown = (event: PointerEvent) => {
      if (!event.isPrimary || event.button !== 0) return;
      pointer.downTarget = panelHit(event);
      pointer.down = pointer.downTarget ? performance.now() : -1;
      pointer.downX = event.clientX;
      pointer.downY = event.clientY;
    };
    const pointerUp = (event: PointerEvent) => {
      const hit = panelHit(event);
      const moved = Math.hypot(
        event.clientX - pointer.downX,
        event.clientY - pointer.downY,
      );
      if (
        pointer.down >= 0 &&
        hit === pointer.downTarget &&
        performance.now() - pointer.down < 300 &&
        moved < 6 &&
        hit
      )
        selectRef.current(String(hit.userData.slug));
      pointer.down = -1;
      pointer.downTarget = null;
    };
    const pointerCancel = () => {
      pointer.down = -1;
      pointer.downTarget = null;
    };
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerup", pointerUp, { passive: true });
    window.addEventListener("pointercancel", pointerCancel, { passive: true });

    let width = 1,
      height = 1,
      visible = true,
      contextLost = false,
      firstFrame = true;
    let frame = 0;
    let lastTime = performance.now();
    const choreography = new SceneChoreography();
    const resize = () => {
      const rect = holder!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = width < 700 ? 52 : 35 + 18 / camera.aspect;
      camera.position.z = width < 700 ? 11.8 : 10.5;
      camera.updateProjectionMatrix();
      backgroundTarget.setSize(
        Math.max(1, Math.floor(width * Math.min(devicePixelRatio, 1.5))),
        Math.max(1, Math.floor(height * Math.min(devicePixelRatio, 1.5))),
      );
      fluid.resize(width, height);
      fluid.setEnabled(width > 700);
      // The background uses a square orthographic camera. Compensate its type
      // plane for the viewport so glyphs keep their natural aspect ratio.
      typePlane.scale.y = (camera.aspect * ((1.94 * 520) / 2048)) / 0.53;
      bgMesh.scale.set(1, 1, 1);
      const mobile = width < 700;
      letter.scale.setScalar(mobile ? 1.2 : 1.4);
      letter.position.x = mobile ? -0.03 : -0.12;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(holder);
    resize();
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersection.observe(holder);
    const visibility = () => {
      visible = !document.hidden;
    };
    document.addEventListener("visibilitychange", visibility);
    const lose = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      holder!.classList.remove("scene-ready");
      holder!.dataset.rendererStatus = "fallback";
      readyRef.current(false);
      failureRef.current?.();
    };
    const restore = () => {
      contextLost = false;
      shaderFailed = false;
      firstFrame = true;
      holder!.dataset.rendererStatus = "loading";
      renderer.compile(scene, camera);
    };
    renderer.domElement.addEventListener("webglcontextlost", lose);
    renderer.domElement.addEventListener("webglcontextrestored", restore);

    const render = (now: number) => {
      frame = requestAnimationFrame(render);
      if (
        !activeRef.current ||
        !visible ||
        document.hidden ||
        contextLost ||
        shaderFailed
      )
        return;
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      const s = stateRef.current.current;
      const chapter = s.chapter;
      const pointerWeight = Math.max(
        0,
        1 - Math.hypot(pointer.ndcX, pointer.ndcY) * 1.5,
      );
      const motion = choreography.update(s, dt, reducedRef.current, {
        x: pointer.dx * pointerWeight,
        y: pointer.dy * pointerWeight,
      });
      pointer.dx = 0;
      pointer.dy = 0;
      const {
        progress: currentProgress,
        workVisibility: workMix,
        lightMix,
        servicesMix,
        contactMix,
        portalProgress: portalMix,
        transitionMix,
        cameraDive,
        reveal,
      } = motion;
      const light = lightMix;
      bgMaterial.uniforms.uTime.value = now * 0.001;
      bgMaterial.uniforms.uLight.value = light;
      bgMaterial.uniforms.uContact.value = contactMix;
      bgMaterial.uniforms.uServices.value = servicesMix;
      bgMaterial.uniforms.uReveal.value = reveal;
      const wordmarkVisibility =
        1 - Math.max(workMix, Math.min(1, currentProgress * 6));
      typeMat.opacity =
        0.9 *
        wordmarkVisibility *
        (1 - contactMix) *
        (1 - lightMix) *
        (1 - servicesMix) *
        reveal;
      fluid.update();
      bgMaterial.uniforms.uFluid.value = fluid.velocity.texture;
      holder!.dataset.chapter = chapter;
      // Render background first: the refractive letter samples this target, which never contains the letter or cards.
      const oldTarget = renderer.getRenderTarget();
      renderer.setRenderTarget(backgroundTarget);
      renderer.clear(true, true, true);
      renderer.render(bgScene, bgCamera);
      renderer.setRenderTarget(oldTarget);

      const center = currentProgress * Math.max(0, panels.length - 1);
      const mobile = width < 700;
      const viewHeight =
        2 *
        Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) *
        (camera.position.z - 3.1);
      const centeredScale = mobile
        ? Math.min(
            (viewHeight * 0.32) / 2.6,
            (viewHeight * camera.aspect * 0.86) / 5.5,
          )
        : (viewHeight * 0.35) / 2.6;
      for (const panel of panels) {
        const index = panel.userData.baseIndex as number;
        const x = index - center;
        const rad = x;
        panel.position.set(
          Math.sin(rad) * (mobile ? 4.1 : 4.9) + (mobile ? 0 : 0.65),
          (mobile ? 1.5 : 0.75) -
            x * (mobile ? 0.85 : 1.05) +
            (1 - workMix) * 2.8,
          Math.cos(rad) * 2.6 + 0.5 - transitionMix * 1.5,
        );
        panel.rotation.set(0, rad * 0.58, 0);
        const scale =
          centeredScale * (0.82 + 0.18 * (1 - Math.min(1, Math.abs(x))));
        panel.scale.setScalar(scale);
        const alpha = THREE.MathUtils.smoothstep(2.5 - Math.abs(x), 0, 1.2);
        const panelOpacity = alpha * workMix;
        (panel.material as THREE.ShaderMaterial).uniforms.uOpacity.value =
          panelOpacity;
        panel.userData.opacity = panelOpacity;
        panel.visible = panelOpacity > 0.005;
      }
      holder!.dataset.activePanels = String(
        panels.filter((panel) => panel.visible && panel.userData.opacity > 0.25)
          .length,
      );

      const drift = 1 - transitionMix;
      const desiredX = reducedRef.current
        ? 0
        : pointer.ndcX * 0.5 * drift + cameraDive * 0.8;
      const desiredY = reducedRef.current ? 0 : pointer.ndcY * 0.5 * drift;
      const cameraTargetZ =
        (mobile ? 11.8 : 10.5) - cameraDive * (mobile ? 3.4 : 4.6);
      camera.position.z +=
        (cameraTargetZ - camera.position.z) * Math.min(1, dt * 2.5);
      camera.position.x += (desiredX - camera.position.x) * Math.min(1, dt * 3);
      camera.position.y += (desiredY - camera.position.y) * Math.min(1, dt * 3);
      camera.lookAt(0, 0, 0);
      const letterScale =
        1.12 - workMix * 0.08 - servicesMix * 0.05 - transitionMix * 0.06;
      letter.scale.setScalar((mobile ? 1.2 : 1.4) * (letterScale / 1.12));
      letter.rotation.x = motion.rotationX;
      letter.rotation.y = motion.rotationY;
      const targetLetterY =
        (mobile ? 0.55 : 0) - workMix * 0.12 - transitionMix * 0.24;
      letter.position.y +=
        (targetLetterY - letter.position.y) * Math.min(1, dt * 2);
      const targetLetterX =
        (mobile ? -0.03 : -0.12) -
        (!mobile ? servicesMix * 1.98 : 0) +
        transitionMix * 0.2;
      letter.position.x +=
        (targetLetterX - letter.position.x) * Math.min(1, dt * 3);
      rMaterial.uniforms.uScene.value = backgroundTarget.texture;
      rMaterial.uniforms.uResolution.value.set(
        width * renderer.getPixelRatio(),
        height * renderer.getPixelRatio(),
      );
      rMaterial.uniforms.uFluid.value = fluid.velocity.texture;
      rMaterial.uniforms.uTime.value = now * 0.001;
      rMaterial.uniforms.uLight.value = light;
      rMaterial.uniforms.uReveal.value = reveal;
      rMaterial.uniforms.uServices.value = servicesMix;
      rMaterial.uniforms.uContact.value = contactMix;
      rMaterial.uniforms.uDepthScale.value =
        0.035 + 0.965 * THREE.MathUtils.smoothstep(reveal, 0.02, 0.8);
      rMaterial.uniforms.uRipple.value =
        Math.sin(reveal * Math.PI) * (0.3 + (1 - reveal) * 0.7);
      outlineMaterial.opacity = light * 0.9;
      displayMaterial.uniforms.uOpacity.value = light;
      displayMaterial.uniforms.uTime.value = now * 0.001;
      const portalAmount = servicesMix * portalMix;
      serviceMaterial.opacity = portalAmount * (mobile ? 0 : 0.92);
      servicePortal.visible = !mobile && portalAmount > 0.005;
      if (panels[0])
        serviceMaterial.map = (
          panels[0].material as THREE.ShaderMaterial
        ).uniforms.uMap.value;
      contactMat.opacity = contactMix * 0.92;
      contactPlane.scale.setScalar(0.9 + contactMix * 0.1);
      letter.visible = contactMix < 0.98;
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      if (firstFrame && !shaderFailed) {
        firstFrame = false;
        holder!.classList.add("scene-ready");
        holder!.dataset.rendererStatus = "ready";
        readyRef.current(true);
      }
    };
    frame = requestAnimationFrame(render);
    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intersection.disconnect();
      holder!.classList.remove("scene-ready");
      readyRef.current(false);
      window.removeEventListener("pointermove", pointerMove);
      window.removeEventListener("pointerdown", pointerDown);
      window.removeEventListener("pointerup", pointerUp);
      window.removeEventListener("pointercancel", pointerCancel);
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lose);
      renderer.domElement.removeEventListener("webglcontextrestored", restore);
      fluid.dispose();
      backgroundTarget.dispose();
      cubeTarget.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      typePlane.geometry.dispose();
      typeMat.dispose();
      createTexture.dispose();
      rGeometry.dispose();
      rMaterial.dispose();
      contactPlane.geometry.dispose();
      contactMat.dispose();
      contactTexture.dispose();
      for (let i = 0; i < panels.length; i++) {
        panels[i].geometry.dispose();
        (panels[i].material as THREE.Material).dispose();
        posters[i]?.dispose();
      }
      outlineGeometry.dispose();
      outlineMaterial.dispose();
      displayPlane.geometry.dispose();
      displayMaterial.dispose();
      serviceGeometry.dispose();
      serviceMaterial.dispose();
      for (const texture of loadedTextures) texture.dispose();
      scene.clear();
      bgScene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={container} className="hero-scene" aria-hidden="true" />;
}
