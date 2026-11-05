import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import type { Project } from "./content";
import type { SceneState } from "./SceneState";
import { drawCreateWordmark } from "./wordmark";
import { FluidField } from "./scene/FluidField";
import { SceneChoreography } from "./scene/choreography";
import { directMp4Url, ProjectVideoTexture } from "./scene/media";
import { sceneTweaks } from "./sceneTweaks";
import { drawLoaderImage } from "./scene/loaderImage";
import { ServiceScene, type ServiceMedia } from "./scene/serviceScene";
import { services as serviceList } from "./content";
import {
  backgroundFragment,
  compositeFragment,
  fullscreenVertex,
  panelFragment,
  panelVertex,
  serviceScreenVertex,
  sideScreenFragment,
  sideScreenVertex,
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

/**
 * CREATE is drawn at 4K, slightly emboldened, then composited so the centre
 * stays sharp while both ends soften into a blur.
 */
function paintCreate(canvas: HTMLCanvasElement) {
  canvas.width = 4096;
  canvas.height = 1040;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const sharp = document.createElement("canvas");
  sharp.width = canvas.width;
  sharp.height = canvas.height;
  const sharpCtx = sharp.getContext("2d")!;
  drawCreateWordmark(sharpCtx, sharp.width, sharp.height, 13);

  const fade = (inner: CanvasRenderingContext2D, centre: boolean) => {
    const gradient = inner.createLinearGradient(0, 0, canvas.width, 0);
    const solid = centre ? "#000" : "transparent";
    const clear = centre ? "transparent" : "#000";
    gradient.addColorStop(0, clear);
    gradient.addColorStop(0.1, solid);
    gradient.addColorStop(0.9, solid);
    gradient.addColorStop(1, clear);
    inner.globalCompositeOperation = "destination-in";
    inner.fillStyle = gradient;
    inner.fillRect(0, 0, canvas.width, canvas.height);
    inner.globalCompositeOperation = "source-over";
  };

  const blurred = document.createElement("canvas");
  blurred.width = canvas.width;
  blurred.height = canvas.height;
  const blurredCtx = blurred.getContext("2d")!;
  blurredCtx.filter = "blur(9px)";
  blurredCtx.drawImage(sharp, 0, 0);
  blurredCtx.filter = "none";
  fade(blurredCtx, false);
  fade(sharpCtx, true);

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(blurred, 0, 0);
  ctx.drawImage(sharp, 0, 0);
}

function wordmarkTexture(text: string, canvas: HTMLCanvasElement) {
  if (text === "CREATE") {
    paintCreate(canvas);
    return;
  }
  canvas.width = 2048;
  canvas.height = 520;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (text === "WORKS") {
    ctx.font = "800 470px Inter, Arial, sans-serif";
    ctx.fillStyle = "#ffffff";
    ctx.fillText(text, 1024, 275, 1960);
    return;
  }
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
  texture.anisotropy = 8;
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  return texture;
}

const CREATE_SCALE = 0.8;
const PANEL_LAYER = 1;

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
  const videoMediaRef = useRef(new Map<number, ProjectVideoTexture>());
  const selectRef = useRef(onSelect);
  selectRef.current = onSelect;

  useEffect(() => {
    if (!active)
      videoMediaRef.current.forEach((media) => media.setActive(false));
  }, [active]);

  useEffect(() => {
    const holder = container.current;
    if (!holder) return;
    const mediaCache = videoMediaRef.current;
    mediaCache.clear();
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
    renderer.debug.onShaderError = (gl, program, vertexShader, fragmentShader) => {
      if (gl.getProgramParameter(program, gl.LINK_STATUS)) return;
      shaderFailed = true;
      mediaCache.forEach((media) => media.setActive(false));
      holder.dataset.rendererStatus = "fallback";
      const diagnostic = [gl.getProgramInfoLog(program), gl.getShaderInfoLog(vertexShader), gl.getShaderInfoLog(fragmentShader)].filter(Boolean).join("\n");
      holder.dataset.shaderError = diagnostic;
      console.error("Portfolio shader compilation failed:", diagnostic);
      holder.classList.remove("scene-ready");
      readyRef.current(false);
      failureRef.current?.();
    };
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.18 : 1.5),
    );
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
    const compositeScene = new THREE.Scene();
    const compositeCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
    compositeCamera.position.z = 2;
    const compositeTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: true,
      stencilBuffer: false,
    });
    compositeTarget.texture.colorSpace = THREE.NoColorSpace;
    const compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: compositeTarget.texture },
        uAspect: { value: new THREE.Vector2(1, 1) },
        uTime: { value: 0 },
        uReveal: { value: 0 },
        uPortalTravel: { value: 0 },
        uRipple: { value: 0 },
        uRainbow: { value: 0 },
        uLoadingMap: { value: null },
        uServiceTex: { value: null },
        uFluid: { value: null },
        uVisibleService: { value: 0 },
      },
      vertexShader: fullscreenVertex,
      fragmentShader: compositeFragment,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    const compositePlane = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), compositeMaterial);
    compositeScene.add(compositePlane);
    const loaderCanvas = document.createElement("canvas");
    drawLoaderImage(loaderCanvas, window.innerWidth, window.innerHeight);
    const loaderTexture = new THREE.CanvasTexture(loaderCanvas);
    loaderTexture.colorSpace = THREE.SRGBColorSpace;
    compositeMaterial.uniforms.uLoadingMap.value = loaderTexture;
    let loaderSize = `${window.innerWidth}x${window.innerHeight}`;
    const backgroundTarget = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
    });
    backgroundTarget.texture.colorSpace = THREE.NoColorSpace;
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
        uFlatten: { value: 0 },
        uFluid: { value: fluid.velocity.texture },
        uInk: { value: fluid.dye.texture },
        uAspect: { value: window.innerWidth / window.innerHeight },
        uLight: { value: 0 },
        uContact: { value: 0 },
        uReveal: { value: 0 },
        uServices: { value: 0 },
        uPortalMedia: { value: null },
        uPortalReveal: { value: 0 },
        uPortalIsVideo: { value: 0 },
        uPortalAspect: { value: 1200 / 760 },
        uWorksMap: { value: null },
        uWorks: { value: 0 },
        uWorksX: { value: 0 },
        uWorksY: { value: 0 },
        uWorkMedia: { value: 0 },
        uScroll: { value: 0 },
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
      opacity: 1,
      depthWrite: false,
      toneMapped: false,
    });
    const typePlane = new THREE.Mesh(
      new THREE.PlaneGeometry(1.94, 0.53),
      typeMat,
    );
    typePlane.position.set(0, 0.04, -3.5);
    const typeFollow = { x: 0, y: 0 };
    bgScene.add(typePlane);
    // WORKS title passes behind the R between the hero and the card track, so
    // the glass letter refracts it the same way it bends CREATE.
    const worksCanvas = document.createElement("canvas");
    const worksTexture = makeCanvasTexture(worksCanvas);
    const paintWorks = () => {
      wordmarkTexture("WORKS", worksCanvas);
      worksTexture.needsUpdate = true;
    };
    paintWorks();
    document.fonts?.ready.then(paintWorks).catch(() => undefined);
    bgMaterial.uniforms.uWorksMap.value = worksTexture;

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
    const rHeight = rGeometry.boundingBox
      ? rGeometry.boundingBox.max.y - rGeometry.boundingBox.min.y
      : 4.2;
    let slotElement: SVGPathElement | null = null;
    const slotRay = new THREE.Vector3();
    const rMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uScene: { value: backgroundTarget.texture },
        uEnv: { value: envMap },
        uResolution: { value: new THREE.Vector2(1, 1) },
        uFluid: { value: fluid.velocity.texture },
        uInk: { value: fluid.dye.texture },
        uTime: { value: 0 },
        uLight: { value: 0 },
        uReveal: { value: 0 },
        uServices: { value: 0 },
        uRoughness: { value: 0.1 },
        uTint: { value: new THREE.Vector3(1, 1, 1) },
        uContact: { value: 0 },
        uNoiseScale: { value: 9 },
        uIorRGB: { value: new THREE.Vector3(1.54, 1.51, 1.48) },
        uDepthScale: { value: 0.035 },
        uMorph: { value: 0 },
        uHalfDepth: { value: 0.3 },
        uHalfHeight: { value: 2.1 },
        uRipple: { value: 0 },
      },
      vertexShader: refractionVertex,
      fragmentShader: refractionFragment,
      // Front faces only, with depth: drawing the back faces without depth
      // let the far side of the extrusion paint over the front as an offset
      // ghost copy of the R.
      side: THREE.FrontSide,
      transparent: true,
      depthWrite: true,
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
    // Side face of the R: a screen that shows colourful noise, then morphs
    // to the full frame and reveals the services scene (reference mechanism).
    const displayMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uOpacity: { value: 0 },
        uTime: { value: 0 },
        uMorph: { value: 0 },
        uVision: { value: 0 },
        uServiceIn: { value: 0 },
        uServiceTex: { value: null },
        uRes: { value: new THREE.Vector2(1, 1) },
      },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      side: THREE.DoubleSide,
      vertexShader: sideScreenVertex,
      fragmentShader: sideScreenFragment,
    });
    const displayPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(0.42, 4.05),
      displayMaterial,
    );
    // The rainbow sits on the R's actual left side face, so it is only seen
    // once the letter turns side-on during the dive into services.
    rGeometry.computeBoundingBox();
    const letterBox = rGeometry.boundingBox!;
    displayPlane.geometry.dispose();
    displayPlane.geometry = new THREE.PlaneGeometry(
      letterBox.max.z - letterBox.min.z,
      letterBox.max.y - letterBox.min.y,
    );
    displayPlane.position.set(
      letterBox.min.x - 0.004,
      (letterBox.max.y + letterBox.min.y) / 2,
      (letterBox.max.z + letterBox.min.z) / 2,
    );
    displayPlane.rotation.y = -Math.PI / 2;
    displayPlane.renderOrder = 4;
    rMaterial.uniforms.uHalfDepth.value = (letterBox.max.z - letterBox.min.z) / 2;
    rMaterial.uniforms.uHalfHeight.value = (letterBox.max.y - letterBox.min.y) / 2;
    displayPlane.frustumCulled = false;
    const serviceScene = new ServiceScene(serviceList.length);
    const serviceTurn = { vision: 0, list: 0, scroll: 1 };
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
              material.uniforms.uMapAspect.value = loaded.image.width / loaded.image.height;
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
        uniforms: {
          uMap: { value: tex },
          uMedia: { value: tex },
          uMediaMix: { value: 0 },
          uMediaIsVideo: { value: 0 },
          uMediaAspect: { value: 1200 / 760 },
          uMapAspect: { value: 1200 / 760 },
          uFrameAspect: { value: 5.5 / 2.6 },
          uOpacity: { value: 0 },
          uDim: { value: 1 },
        },
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
      // Cards live on their own layer: they are drawn into the buffer the R
      // refracts (as the reference does), never in front of the letter.
      panel.layers.set(PANEL_LAYER);
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

    bgMaterial.uniforms.uPortalMedia.value = posters[0];
    const serviceMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: posters[0] },
        uMedia: { value: posters[0] },
        uMediaMix: { value: 0 },
        uMediaIsVideo: { value: 0 },
        uMediaAspect: { value: 1200 / 760 },
        uMapAspect: { value: 1200 / 760 },
        uFrameAspect: { value: 4.7 / 3.1 },
        uDim: { value: 0.18 },
        uOpacity: { value: 0 },
      },
      vertexShader: serviceScreenVertex,
      fragmentShader: panelFragment,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    Object.assign(serviceMaterial.uniforms, {
      uTime: { value: 0 },
      uWave: { value: 0 },
      uBow: { value: 0 },
      uScroll: { value: 0 },
      uSize: { value: 1 },
    });
    // Services screen: a finely subdivided unit plane parented to the camera.
    // It starts filling the frame straight after the rainbow dive, then
    // settles onto the layout box of the (hidden) DOM media panel.
    const servicePortal = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1, 48, 30),
      serviceMaterial,
    );
    servicePortal.renderOrder = 3;
    servicePortal.visible = false;
    camera.add(servicePortal);
    scene.add(camera);

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
    raycaster.layers.enable(PANEL_LAYER);
    const pointerMove = (event: PointerEvent) => {
      if (
        !activeRef.current ||
        event.pointerType !== "mouse" ||
        reducedRef.current
      )
        return;
      const rect = holder!.getBoundingClientRect();
      const x = THREE.MathUtils.clamp(
        (event.clientX - rect.left) / rect.width,
        0,
        1,
      );
      const y = THREE.MathUtils.clamp(
        (event.clientY - rect.top) / rect.height,
        0,
        1,
      );
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
    const pointerLeave = () => {
      pointer.ndcX = pointer.ndcY = 0;
      pointer.dx = pointer.dy = 0;
      pointer.px = pointer.x = pointer.py = pointer.y = 0.5;
    };
    window.addEventListener("pointermove", pointerMove, { passive: true });
    window.addEventListener("pointerdown", pointerDown, { passive: true });
    window.addEventListener("pointerup", pointerUp, { passive: true });
    window.addEventListener("pointercancel", pointerCancel, { passive: true });
    document.addEventListener("pointerleave", pointerLeave);
    window.addEventListener("blur", pointerLeave);

    let width = 1,
      height = 1,
      visible = true,
      contextLost = false,
      firstFrame = true;
    let frame = 0;
    let lastTime = performance.now();
    const userRot = { x: 0, y: 0 };
    const faceWorld = new THREE.Vector3();
    const lookTarget = new THREE.Vector3();
    const faceNormal = new THREE.Vector3();
    const zoomTarget = new THREE.Vector3();
    const baseTarget = new THREE.Vector3();
    const choreography = new SceneChoreography();
    const resize = () => {
      const rect = holder!.getBoundingClientRect();
      width = Math.max(1, rect.width);
      height = Math.max(1, rect.height);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio || 1, width < 700 ? 1.18 : 1.5),
      );
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.fov = width < 700 ? 52 : 35 + 18 / camera.aspect;
      camera.position.z = width < 700 ? 11.8 : 10.5;
      camera.updateProjectionMatrix();
      backgroundTarget.setSize(
        Math.max(1, Math.floor(width * Math.min(devicePixelRatio, 1.5))),
        Math.max(1, Math.floor(height * Math.min(devicePixelRatio, 1.5))),
      );
      compositeTarget.setSize(
        Math.max(1, Math.floor(width * renderer.getPixelRatio())),
        Math.max(1, Math.floor(height * renderer.getPixelRatio())),
      );
      fluid.resize(width, height);
      serviceScene.setSize(width, height, renderer.getPixelRatio());
      fluid.setEnabled(width > 700);
      // The background uses a square orthographic camera. Compensate its type
      // plane for the viewport so glyphs keep their natural aspect ratio.
      // CREATE sits further back behind the R: smaller than full width.
      typePlane.scale.x = CREATE_SCALE;
      typePlane.scale.y = ((camera.aspect * ((1.94 * 520) / 2048)) / 0.53) * CREATE_SCALE;
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
      if (!visible) mediaCache.forEach((media) => media.setActive(false));
    });
    intersection.observe(holder);
    const visibility = () => {
      visible = !document.hidden;
      if (!visible) mediaCache.forEach((media) => media.setActive(false));
    };
    document.addEventListener("visibilitychange", visibility);
    const lose = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      mediaCache.forEach((media) => media.setActive(false));
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
      renderer.compile(compositeScene, compositeCamera);
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
        positionX: pointer.ndcX,
        positionY: pointer.ndcY,
      });
      pointer.dx = 0;
      pointer.dy = 0;
      const {
        progress: currentProgress,
        workVisibility: workMix,
        lightMix,
        servicesMix,
        contactMix,
        heroExit,
        workEntry,
        workExit,
        paleFlatten,
        portalTravel,
        portalReveal,
        workMediaProgress,
        finaleProgress,
        transitionMix,
        cameraDive,
        reveal,
      } = motion;
      // Rainbow dive: the R regains depth and turns its rainbow side to the
      // camera, the camera flies into that face until it fills the frame, and
      // services take over underneath before the rainbow clears.
      // Two-step turn: a slight tilt that shows a sliver of rainbow while the
      // vision copy is read, then the next scroll turns it fully side-on.
      // Reference turn: vision eases in (lerp .5); the service turn follows
      // scroll directly; the services sheet eases in (lerp .3).
      const ease = (k: number) => 1 - Math.pow(1 - k, dt * 60);
      serviceTurn.vision += ((s.visionRotate ?? 0) - serviceTurn.vision) * ease(0.5 * 0.2);
      serviceTurn.list += ((s.serviceListIn ?? 0) - serviceTurn.list) * ease(0.3 * 0.2);
      // Exit runs the handoff in reverse: the full-frame screen shrinks back
      // into the R's left side, returns to colour noise, then disappears.
      const exit = s.serviceExit ?? 0;
      const exitMorph = 1 - THREE.MathUtils.smoothstep(exit, 0.36, 0.8);
      const exitScreen = 1 - THREE.MathUtils.smoothstep(exit, 0.68, 0.9);
      const exitVision = 1 - THREE.MathUtils.smoothstep(exit, 0.9, 1);
      const inExit = exit > 0;
      const visionRotate =
        (inExit ? exitVision : serviceTurn.vision) * (1 - contactMix);
      const serviceRotate =
        (inExit ? exitMorph : (s.serviceRotate ?? 0)) * (1 - contactMix);
      const serviceScreenIn = inExit ? exitScreen : (s.serviceScreenIn ?? 0);
      const visibleService =
        servicesMix >= 0.999 && contactMix < 0.001 && !inExit ? 1 : 0;
      const diveTurn = visionRotate;
      // The zoom releases while the rainbow still covers the frame, so the
      // camera is back in place by the time services is revealed.
      // Pale ends only once the side screen fills the frame.
      const palePhase =
        paleFlatten * (1 - THREE.MathUtils.smoothstep(serviceRotate, 0.93, 1)) * (inExit ? 0 : 1);
      const light = Math.max(lightMix, palePhase) * (1 - contactMix);
      const portalPulse = 0;
      const cameraApproach = Math.max(0, cameraDive - portalTravel * 1.8);
      bgMaterial.uniforms.uTime.value = now * 0.001;
      bgMaterial.uniforms.uLight.value = light;
      // The curved wall unrolls flat together with the R's extrusion.
      bgMaterial.uniforms.uFlatten.value = THREE.MathUtils.smoothstep(palePhase, 0.05, 0.85);
      bgMaterial.uniforms.uContact.value = contactMix;
      bgMaterial.uniforms.uServices.value = servicesMix;
      bgMaterial.uniforms.uReveal.value = reveal;
      const wordmarkVisibility =
        1 - Math.max(heroExit, workMix, Math.min(1, currentProgress * 6));
      typeMat.opacity =
        wordmarkVisibility *
        (1 - Math.min(1, (stateRef.current.current.worksTitle ?? 0) * 2.2)) *
        (1 - contactMix) *
        (1 - lightMix) *
        (1 - servicesMix) *
        0.88;
      typeFollow.x += (pointer.ndcX * 0.035 - typeFollow.x) * Math.min(1, dt * 3);
      typeFollow.y += (pointer.ndcY * 0.025 - typeFollow.y) * Math.min(1, dt * 3);
      typePlane.position.x = reducedRef.current ? 0 : typeFollow.x;
      typePlane.position.y = 0.04 + (reducedRef.current ? 0 : typeFollow.y);
      const worksTitle = s.worksTitle ?? 0;
      // Signed travel lets the title slide in from one side and out the other.
      bgMaterial.uniforms.uWorks.value =
        worksTitle * (1 - lightMix) * (workEntry > 0.5 ? -1 : 1);
      fluid.setReveal(reveal);
      fluid.update(dt);
      bgMaterial.uniforms.uFluid.value = fluid.velocity.texture;
      bgMaterial.uniforms.uInk.value = fluid.dye.texture;
      bgMaterial.uniforms.uAspect.value = width / height;
      holder!.dataset.chapter = chapter;
      const center = currentProgress * Math.max(0, panels.length - 1);
      const mobile = width < 700;
      const selectedIndex = Math.round(
        THREE.MathUtils.clamp(workMediaProgress, 0, 1) * Math.max(0, panels.length - 1),
      );
      const selectedProject = projectsRef.current[selectedIndex];
      let selectedVideo = mediaCache.get(selectedIndex);
      const videoUrl = directMp4Url(selectedProject?.videoUrl);
      if (videoUrl && !selectedVideo && (workMix > 0.01 || portalReveal > 0.015)) {
        selectedVideo = new ProjectVideoTexture(videoUrl);
        mediaCache.set(selectedIndex, selectedVideo);
      }
      const mediaActive =
        !!selectedVideo &&
        !mobile &&
        !reducedRef.current &&
        activeRef.current &&
        visible &&
        !document.hidden &&
        !contextLost &&
        !shaderFailed &&
        contactMix < 0.98 &&
        (workMix > 0.01 || portalReveal > 0.015);
      // The active service's project media feeds both the dive screen and
      // the services panel. Its video (if any) plays alongside the works one.
      const servicePos = (s.servicesProgress ?? 0) * serviceList.length;
      const serviceIndex = Math.max(
        0,
        Math.min(serviceList.length - 1, Math.floor(servicePos)),
      );
      const serviceProjectIndex = Math.max(
        0,
        projectsRef.current.findIndex(
          (project) => project.slug === serviceList[serviceIndex]?.project,
        ),
      );
      const serviceProject = projectsRef.current[serviceProjectIndex];
      const serviceVideoUrl = directMp4Url(serviceProject?.videoUrl);
      const serviceWanted =
        (portalTravel > 0.6 || servicesMix > 0.01) && contactMix < 0.98 && !mobile && !reducedRef.current;
      let serviceVideo = mediaCache.get(serviceProjectIndex);
      if (serviceVideoUrl && !serviceVideo && serviceWanted) {
        serviceVideo = new ProjectVideoTexture(serviceVideoUrl);
        mediaCache.set(serviceProjectIndex, serviceVideo);
      }
      mediaCache.forEach((media, index) =>
        media.setActive(
          (mediaActive && index === selectedIndex) ||
            (serviceWanted && activeRef.current && visible && !document.hidden && index === serviceProjectIndex),
        ),
      );
      const serviceVideoReady = !!serviceVideo?.ready && !serviceVideo.video.paused;
      const servicePoster =
        ((panels[serviceProjectIndex]?.material as THREE.ShaderMaterial | undefined)?.uniforms.uMap
          .value as THREE.Texture) || posters[serviceProjectIndex] || posters[0];
      const serviceProjectTexture = {
        serviceIndex,
        texture: serviceVideoReady && serviceVideo ? serviceVideo.texture : servicePoster,
        isVideo: serviceVideoReady,
        aspect:
          serviceVideoReady && serviceVideo && serviceVideo.video.videoHeight > 0
            ? serviceVideo.video.videoWidth / serviceVideo.video.videoHeight
            : servicePoster?.image?.width && servicePoster?.image?.height
              ? servicePoster.image.width / servicePoster.image.height
              : 1200 / 760,
      };
      const selectedPoster = (panels[selectedIndex]?.material as THREE.ShaderMaterial | undefined)?.uniforms.uMap.value as THREE.Texture || posters[selectedIndex] || posters[0];
      const videoReady = !!selectedVideo?.ready && !selectedVideo.video.paused;
      const selectedTexture =
        videoReady && selectedVideo
          ? selectedVideo.texture
          : selectedPoster;
      const mediaAspect =
        videoReady && selectedVideo && selectedVideo.video.videoHeight > 0
          ? selectedVideo.video.videoWidth / selectedVideo.video.videoHeight
          : selectedPoster?.image?.width && selectedPoster?.image?.height
            ? selectedPoster.image.width / selectedPoster.image.height
            : 1200 / 760;
      bgMaterial.uniforms.uPortalMedia.value = selectedTexture;
      bgMaterial.uniforms.uPortalReveal.value = 0;
      bgMaterial.uniforms.uPortalIsVideo.value = videoReady ? 1 : 0;
      bgMaterial.uniforms.uPortalAspect.value = mediaAspect;
      // Video wall during the work track; the wall scrolls with the page.
      bgMaterial.uniforms.uWorkMedia.value = workMix * (1 - lightMix);
      bgMaterial.uniforms.uScroll.value = (window.scrollY / Math.max(1, height)) * 0.06;
      // WORKS crosses the wall from top-left to bottom-right.
      bgMaterial.uniforms.uWorksX.value =
        THREE.MathUtils.lerp(0.5, -0.5, s.worksTravel ?? 0) * (width / height);
      bgMaterial.uniforms.uWorksY.value = THREE.MathUtils.lerp(-0.62, 0.62, s.worksTravel ?? 0);
      // Refraction samples an independent background target, avoiding feedback from the letter/portal.
      renderer.setRenderTarget(backgroundTarget);
      renderer.clear(true, true, true);
      renderer.render(bgScene, bgCamera);
      const entryProgress = THREE.MathUtils.smoothstep(workEntry, 0.2, 0.86);
      const panelExit = THREE.MathUtils.clamp(workExit, 0, 1);
      for (const panel of panels) {
        const index = panel.userData.baseIndex as number;
        const normalizedOffset = index - center;
        const x = normalizedOffset * 0.68 + (1 - entryProgress) * 0.85;
        panel.position.set(
          Math.sin(x) * 11 - panelExit * 11,
          -x + (mobile ? -0.18 : 0),
          Math.cos(x) * 5 - 4.2 - transitionMix * 1.5,
        );
        panel.rotation.set(0, x * 0.6, 0);
        const scale = 0.98 + 0.4 * (1 - Math.min(1, Math.abs(normalizedOffset)));
        panel.scale.setScalar(scale);
        const edge = 1 - THREE.MathUtils.smoothstep(Math.abs(normalizedOffset), 0.8, 2.5);
        const panelOpacity = edge * entryProgress * (1 - panelExit) * workMix;
        const material = panel.material as THREE.ShaderMaterial;
        material.uniforms.uOpacity.value = panelOpacity;
        material.uniforms.uMedia.value = index === selectedIndex ? selectedTexture : posters[index];
        material.uniforms.uMediaMix.value =
          index === selectedIndex && videoReady ? 1 : 0;
        material.uniforms.uMediaIsVideo.value =
          index === selectedIndex && selectedTexture === selectedVideo?.texture ? 1 : 0;
        material.uniforms.uMediaAspect.value = mediaAspect;
        panel.userData.opacity = panelOpacity;
        panel.visible = panelOpacity > 0.005;
      }
      holder!.dataset.activePanels = String(
        panels.filter((panel) => panel.visible && panel.userData.opacity > 0.25)
          .length,
      );

      const drift = (1 - Math.max(light, portalPulse)) * (1 - contactMix);
      const desiredX = reducedRef.current
        ? 0
        : pointer.ndcX * 0.82 * drift + cameraApproach * 0.8 - portalPulse * 1.2;
      const desiredY = reducedRef.current ? 0 : pointer.ndcY * 0.64 * drift;
      const cameraTargetZ =
        (mobile ? 11.8 : 10.5) - cameraApproach * (mobile ? 3.4 : 4.6) - portalPulse * 1.2;
      // Zoom into the R's side face instead of stretching the letter: the
      // camera swings onto the face's normal and closes in until the rainbow
      // screen fills the frame. The exit runs the same path backwards.
      const zoom = THREE.MathUtils.smoothstep(serviceRotate, 0.04, 0.96);
      if (zoom <= 0.001) {
        camera.position.z += (cameraTargetZ - camera.position.z) * Math.min(1, dt * 2.5);
        camera.position.x += (desiredX - camera.position.x) * Math.min(1, dt * 3);
        camera.position.y += (desiredY - camera.position.y) * Math.min(1, dt * 3);
        camera.lookAt(0, 0, 0);
      }
      const letterScale =
        1.12 - workMix * 0.08 - servicesMix * 0.05 - transitionMix * 0.06;
      const finaleShift = THREE.MathUtils.smoothstep(finaleProgress, 0, 0.45);
      // Finale: measure the R slot of the closing CREATE and dock the letter
      // exactly onto it (position and height), instead of guessed offsets.
      let slot: { x: number; y: number; scale: number } | null = null;
      if (contactMix > 0.001) {
        slotElement ??= document.querySelector<SVGPathElement>(
          '.closing-create path[data-letter="R"]',
        );
        const rect = slotElement?.isConnected ? slotElement.getBoundingClientRect() : null;
        if (!slotElement?.isConnected) slotElement = null;
        if (rect && rect.height > 4) {
          // Cast the slot centre through the live camera onto the letter's
          // z = 0 plane, so the dock holds even while the camera settles.
          const hostRect = holder!.getBoundingClientRect();
          const ndcX = ((rect.left + rect.width / 2 - hostRect.left) / width) * 2 - 1;
          const ndcY = 1 - ((rect.top + rect.height / 2 - hostRect.top) / height) * 2;
          camera.updateMatrixWorld();
          slotRay.set(ndcX, ndcY, 0.5).unproject(camera).sub(camera.position);
          const t = -camera.position.z / (slotRay.z || -1e-6);
          const distance = Math.max(0.1, camera.position.z);
          const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * distance;
          slot = {
            x: camera.position.x + slotRay.x * t,
            y: camera.position.y + slotRay.y * t,
            scale: ((rect.height / height) * 2 * halfH) / rHeight,
          };
        }
      }
      const baseScale = (mobile ? 1.2 : 1.4) * (letterScale / 1.12) * (1 - contactMix * 0.42);
      letter.scale.setScalar(
        slot ? THREE.MathUtils.lerp(baseScale, slot.scale, contactMix * finaleShift) : baseScale,
      );
      // Gizmo offsets ease in and fade out once the hero is left behind.
      const userWeight = (1 - heroExit) * (1 - contactMix) * (reducedRef.current ? 0 : 1);
      userRot.x += (sceneTweaks.userRotX * userWeight - userRot.x) * Math.min(1, dt * 6);
      userRot.y += (sceneTweaks.userRotY * userWeight - userRot.y) * Math.min(1, dt * 6);
      const steady = 1 - THREE.MathUtils.smoothstep(serviceRotate, 0, 0.35);
      letter.rotation.x =
        motion.rotationX * (1 - contactMix) * steady -
        (visionRotate * 0.1 + serviceRotate * 0.2) +
        userRot.x;
      letter.rotation.y =
        motion.rotationY * (1 - palePhase) * (1 - contactMix) * (1 - visionRotate) * steady +
        (visionRotate * 0.15 + serviceRotate * 0.5) * Math.PI * 0.5 +
        userRot.y * steady;
      const q = letter.quaternion;
      sceneTweaks.quaternion = [q.x, q.y, q.z, q.w];
      holder!.dataset.rotationX = motion.rotationX.toFixed(3);
      holder!.dataset.rotationY = motion.rotationY.toFixed(3);
      holder!.dataset.reveal = reveal.toFixed(3);
      let targetLetterY =
        (mobile ? 0.55 : 0) - workMix * 0.12 - palePhase * 0.24 + contactMix * 1.3;
      let targetLetterX =
        (mobile ? -0.03 : -0.12) -
        (!mobile ? servicesMix * (1 - contactMix) * (1 - exit) * 1.98 : 0) +
        palePhase * 0.2;
      if (slot) {
        const dock = contactMix * finaleShift;
        targetLetterX = THREE.MathUtils.lerp(targetLetterX, slot.x, dock);
        targetLetterY = THREE.MathUtils.lerp(targetLetterY, slot.y, dock);
      }
      // Track the docking target tightly so the R stays locked to its slot.
      const follow = slot && finaleShift > 0.01 ? 8 : 0;
      letter.position.y +=
        (targetLetterY - letter.position.y) * Math.min(1, dt * (follow || 2));
      letter.position.x +=
        (targetLetterX - letter.position.x) * Math.min(1, dt * (follow || 3));
      if (zoom > 0.001) {
        letter.updateMatrixWorld(true);
        displayPlane.getWorldPosition(faceWorld);
        faceNormal.set(-1, 0, 0).applyQuaternion(letter.quaternion).normalize();
        const swing = THREE.MathUtils.smoothstep(zoom, 0, 0.45);
        const closeIn = zoom * zoom * (3 - 2 * zoom);
        const zoomDistance = cameraTargetZ * Math.pow(0.6 / cameraTargetZ, closeIn);
        zoomTarget.copy(faceWorld).addScaledVector(faceNormal, zoomDistance);
        // Pointer drift fades out quickly as the camera closes in.
        const calm = (1 - swing) * (1 - swing);
        baseTarget.set(desiredX * calm, desiredY * calm, cameraTargetZ).lerp(zoomTarget, swing);
        camera.position.copy(baseTarget);
        lookTarget.set(0, 0, 0).lerp(faceWorld, swing);
        camera.lookAt(lookTarget);
      }
      rMaterial.uniforms.uScene.value = backgroundTarget.texture;
      rMaterial.uniforms.uResolution.value.set(
        width * renderer.getPixelRatio(),
        height * renderer.getPixelRatio(),
      );
      rMaterial.uniforms.uFluid.value = fluid.velocity.texture;
      rMaterial.uniforms.uInk.value = fluid.dye.texture;
      rMaterial.uniforms.uTime.value = now * 0.001;
      rMaterial.uniforms.uRoughness.value = sceneTweaks.roughness;
      rMaterial.uniforms.uNoiseScale.value = sceneTweaks.noiseScale;
      rMaterial.uniforms.uIorRGB.value.set(
        1.51 + sceneTweaks.dispersion,
        1.51,
        1.51 - sceneTweaks.dispersion,
      );
      rMaterial.uniforms.uTint.value.set(...sceneTweaks.tint);
      rMaterial.uniforms.uLight.value = light * (1 - diveTurn);
      rMaterial.uniforms.uReveal.value = reveal;
      rMaterial.uniforms.uServices.value =
        servicesMix * (1 - contactMix) * (1 - THREE.MathUtils.smoothstep(exit, 0, 0.25));
      rMaterial.uniforms.uMorph.value = 0;
      rMaterial.uniforms.uContact.value = contactMix * THREE.MathUtils.smoothstep(finaleProgress, 0.78, 1);
      rMaterial.uniforms.uDepthScale.value =
        1 - palePhase * 0.97 * (1 - diveTurn);
      // The side face tracks the letter's live extrusion depth.
      displayPlane.scale.x = Math.max(0.02, rMaterial.uniforms.uDepthScale.value);
      rMaterial.uniforms.uRipple.value = 0;
      outlineMaterial.opacity = light * (1 - diveTurn) * (1 - serviceRotate);
      displayMaterial.uniforms.uOpacity.value = (1 - visibleService) * (1 - contactMix);
      displayMaterial.uniforms.uTime.value = now * 0.001;
      displayMaterial.uniforms.uVision.value = visionRotate;
      displayMaterial.uniforms.uMorph.value = THREE.MathUtils.smoothstep(serviceRotate, 0.9, 1);
      displayMaterial.uniforms.uServiceIn.value = serviceScreenIn;
      displayMaterial.uniforms.uServiceTex.value = serviceScene.target.texture;
      displayMaterial.uniforms.uRes.value.set(
        width * renderer.getPixelRatio(),
        height * renderer.getPixelRatio(),
      );
      displayPlane.visible = visionRotate > 0.001 && !reducedRef.current;
      // ---- Services scene (carousel on a bent sheet) ----
      const servicesProgress = s.servicesProgress ?? 0;
      {
        // Carousel index after the reference: mostly snapped to the nearest
        // service, then eased.
        // Starts half a slot to the right (and further until the sheet has
        // arrived), so the first panel slides in from the right edge.
        let raw = 0.5 + servicesProgress * serviceList.length;
        raw -= (1 - serviceTurn.list) * 0.4;
        raw = THREE.MathUtils.clamp(raw, -0.5, serviceList.length);
        // Each panel holds in the centre for the middle of its scroll range
        // and only travels near the boundaries.
        const nearest = Math.round(raw);
        const d = raw - nearest;
        const snapped =
          raw < 1
            ? raw
            : nearest + Math.sign(d) * 0.5 * THREE.MathUtils.smoothstep(Math.abs(d), 0.22, 0.5);
        serviceTurn.scroll += (snapped - serviceTurn.scroll) * ease(0.5 * 0.2);
      }
      const serviceNeeded =
        !reducedRef.current &&
        (serviceScreenIn > 0 || servicesMix > 0 || (inExit && exit < 1)) &&
        contactMix < 0.999;
      if (serviceNeeded) {
        const media: ServiceMedia[] = serviceList.map((service, i) => {
          if (i === serviceProjectTexture.serviceIndex) return serviceProjectTexture;
          const index = Math.max(
            0,
            projectsRef.current.findIndex((project) => project.slug === service.project),
          );
          const poster =
            ((panels[index]?.material as THREE.ShaderMaterial | undefined)?.uniforms.uMap
              .value as THREE.Texture) || posters[index] || posters[0];
          return {
            texture: poster,
            isVideo: false,
            aspect:
              poster?.image?.width && poster?.image?.height
                ? poster.image.width / poster.image.height
                : 1200 / 760,
          };
        });
        serviceScene.update({
          time: now * 0.001,
          serviceIn: Math.max(serviceTurn.list, serviceScreenIn * 0.35),
          scroll: serviceTurn.scroll,
          full: THREE.MathUtils.smoothstep(servicesProgress, 0.9, 0.985),
          opacity: 1,
          media,
        });
        serviceScene.render(renderer);
      }
      contactMat.opacity = 0;
      letter.visible = true;
      holder!.dataset.depth = rMaterial.uniforms.uDepthScale.value.toFixed(3);
      holder!.dataset.finale = finaleProgress.toFixed(3);
      // Work cards go into the refraction buffer on top of the wall, so the
      // R sits in front of them and bends them like the rest of the scene.
      if (panels.some((panel) => panel.visible)) {
        const autoClear = renderer.autoClear;
        const background = scene.background;
        renderer.autoClear = false;
        scene.background = null;
        camera.layers.set(PANEL_LAYER);
        renderer.setRenderTarget(backgroundTarget);
        renderer.render(scene, camera);
        camera.layers.set(0);
        scene.background = background;
        renderer.autoClear = autoClear;
      }
      renderer.setRenderTarget(compositeTarget);
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
      compositeMaterial.uniforms.uTime.value = now * 0.001;
      compositeMaterial.uniforms.uAspect.value.set(width / height, 1);
      compositeMaterial.uniforms.uReveal.value = reveal;
      compositeMaterial.uniforms.uPortalTravel.value = portalTravel;
      compositeMaterial.uniforms.uRipple.value = 0;
      compositeMaterial.uniforms.uServiceTex.value = serviceScene.target.texture;
      compositeMaterial.uniforms.uFluid.value = fluid.velocity.texture;
      compositeMaterial.uniforms.uVisibleService.value = visibleService;
      if (reveal < 0.999) {
        const size = `${width}x${height}`;
        if (size !== loaderSize) {
          loaderSize = size;
          drawLoaderImage(loaderCanvas, width, height);
          loaderTexture.needsUpdate = true;
        }
      }
      renderer.setRenderTarget(null);
      renderer.clear(true, true, true);
      renderer.render(compositeScene, compositeCamera);
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
      document.removeEventListener("pointerleave", pointerLeave);
      window.removeEventListener("blur", pointerLeave);
      document.removeEventListener("visibilitychange", visibility);
      renderer.domElement.removeEventListener("webglcontextlost", lose);
      renderer.domElement.removeEventListener("webglcontextrestored", restore);
      fluid.dispose();
      mediaCache.forEach((media) => media.dispose());
      mediaCache.clear();
      backgroundTarget.dispose();
      compositeTarget.dispose();
      compositePlane.geometry.dispose();
      compositeMaterial.dispose();
      cubeTarget.dispose();
      bgGeometry.dispose();
      bgMaterial.dispose();
      typePlane.geometry.dispose();
      typeMat.dispose();
      createTexture.dispose();
      worksTexture.dispose();
      loaderTexture.dispose();
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
      servicePortal.geometry.dispose();
      camera.remove(servicePortal);
      serviceScene.dispose();
      serviceMaterial.dispose();
      for (const texture of loadedTextures) texture.dispose();
      scene.clear();
      bgScene.clear();
      compositeScene.clear();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return <div ref={container} className="hero-scene" aria-hidden="true" />;
}
