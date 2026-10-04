import { useEffect, useRef } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise.js";

export default function HeroScene({
  progress,
  reducedMotion,
  onReady,
}: {
  progress: React.RefObject<number>;
  reducedMotion: boolean;
  onReady: (value: boolean) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!container.current) return;
    const holder = container.current;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      onReady(false);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.7));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.35;
    holder.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(33, 1, 0.1, 60);
    camera.position.set(0, 0, 10.5);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.025);
    scene.environment = environment.texture;
    room.dispose();
    const shape = new THREE.Shape();
    shape.moveTo(-1.48, -2);
    shape.lineTo(-1.48, 2);
    shape.lineTo(0.18, 2);
    shape.bezierCurveTo(1.15, 2, 1.55, 1.55, 1.55, 0.72);
    shape.bezierCurveTo(1.55, 0.1, 1.2, -0.32, 0.7, -0.48);
    shape.lineTo(1.66, -2);
    shape.lineTo(0.54, -2);
    shape.lineTo(-0.27, -0.68);
    shape.lineTo(-0.57, -0.68);
    shape.lineTo(-0.57, -2);
    shape.closePath();
    const hole = new THREE.Path();
    hole.moveTo(-0.57, 1.14);
    hole.lineTo(-0.57, 0.15);
    hole.lineTo(0.12, 0.15);
    hole.bezierCurveTo(0.83, 0.15, 0.83, 1.14, 0.12, 1.14);
    hole.closePath();
    shape.holes.push(hole);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 0.47,
      bevelEnabled: true,
      bevelThickness: 0.075,
      bevelSize: 0.065,
      bevelSegments: 5,
      curveSegments: 24,
    });
    geometry.center();
    const noise = new ImprovedNoise();
    const pixels = new Uint8Array(128 * 128 * 4);
    for (let y = 0; y < 128; y++)
      for (let x = 0; x < 128; x++) {
        const a = (x / 128) * Math.PI * 2,
          b = (y / 128) * Math.PI * 2;
        const field =
          (noise.noise(Math.cos(a), Math.sin(a), Math.cos(b)) +
            noise.noise(Math.cos(b), Math.sin(b), Math.sin(a))) *
          0.5;
        const value = Math.round((field * 0.5 + 0.5) * 255);
        const offset = (y * 128 + x) * 4;
        pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = value;
        pixels[offset + 3] = 255;
      }
    const bump = new THREE.DataTexture(pixels, 128, 128, THREE.RGBAFormat);
    bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
    bump.repeat.set(0.38, 0.38);
    bump.minFilter = bump.magFilter = THREE.LinearFilter;
    bump.needsUpdate = true;
    const material = new THREE.MeshPhysicalMaterial({
      color: 0xe2e6ec,
      metalness: 1,
      roughness: 0.16,
      bumpMap: bump,
      bumpScale: 0.18,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      envMapIntensity: 2,
      iridescence: 0.28,
      iridescenceIOR: 1.4,
      iridescenceThicknessRange: [120, 360],
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    const light = new THREE.DirectionalLight(0xffffff, 4);
    light.position.set(-3, 4, 5);
    scene.add(light);
    const rim = new THREE.DirectionalLight(0x84e9ff, 3);
    rim.position.set(4, 1, -2);
    scene.add(rim);
    const warm = new THREE.DirectionalLight(0xbec5ff, 2);
    warm.position.set(-4, -3, 1);
    scene.add(warm);
    const pointer = { x: 0, y: 0 };
    const point = (event: PointerEvent) => {
      if (event.pointerType !== "mouse" || reducedMotion) return;
      pointer.x = (event.clientX / window.innerWidth - 0.5) * 0.22;
      pointer.y = (event.clientY / window.innerHeight - 0.5) * 0.14;
    };
    const resize = () => {
      const { width, height } = holder.getBoundingClientRect();
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.position.z = width < 600 ? 12.2 : 10.5;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(holder);
    resize();
    let visible = true,
      contextLost = false;
    const intersection = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
    });
    intersection.observe(holder);
    const lose = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      holder.classList.remove("scene-ready");
      onReady(false);
    };
    renderer.domElement.addEventListener("webglcontextlost", lose);
    window.addEventListener("pointermove", point, { passive: true });
    let frame = 0,
      first = true;
    const start = performance.now();
    const render = (time: number) => {
      frame = requestAnimationFrame(render);
      if (!visible || document.hidden || contextLost) return;
      const p = reducedMotion ? 0 : progress.current;
      mesh.rotation.x = THREE.MathUtils.lerp(
        mesh.rotation.x,
        -0.12 + pointer.y + p * 0.16,
        0.05,
      );
      mesh.rotation.y = THREE.MathUtils.lerp(
        mesh.rotation.y,
        -0.27 + pointer.x + p * 0.7,
        0.05,
      );
      mesh.rotation.z = THREE.MathUtils.lerp(
        mesh.rotation.z,
        -0.07 - p * 0.1,
        0.05,
      );
      mesh.position.y = reducedMotion
        ? 0
        : Math.sin((time - start) * 0.00065) * 0.05 - p * 0.13;
      const scale = 1 - p * 0.15;
      mesh.scale.setScalar(scale);
      renderer.render(scene, camera);
      if (first) {
        first = false;
        holder.classList.add("scene-ready");
        onReady(true);
      }
    };
    frame = requestAnimationFrame(render);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", point);
      renderer.domElement.removeEventListener("webglcontextlost", lose);
      observer.disconnect();
      intersection.disconnect();
      geometry.dispose();
      material.dispose();
      bump.dispose();
      environment.dispose();
      pmrem.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [progress, reducedMotion, onReady]);
  return <div ref={container} className="hero-scene" aria-hidden="true" />;
}
