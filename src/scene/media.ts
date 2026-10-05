import * as THREE from "three";

/** A direct video file may be used as project media; platform embeds are never scraped. */
export function directMp4Url(url?: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, document.baseURI);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
    return /\.mp4$/i.test(parsed.pathname) ? parsed.href : null;
  } catch {
    return null;
  }
}

/** Lazily activated, muted video-backed texture with explicit media cleanup. */
export class ProjectVideoTexture {
  readonly video: HTMLVideoElement;
  readonly texture: THREE.VideoTexture;
  private active = false;
  private disposed = false;

  constructor(url: string) {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.src = url;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;
    video.loop = true;
    video.playsInline = true;
    video.preload = "metadata";
    video.autoplay = false;
    this.video = video;
    this.texture = new THREE.VideoTexture(video);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
  }

  get ready() {
    return this.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
  }

  setActive(active: boolean) {
    if (this.disposed || this.active === active) return;
    this.active = active;
    if (!active) {
      this.video.pause();
      return;
    }
    // Explicitly muted even if site settings later change. Rejected autoplay keeps the poster.
    this.video.muted = true;
    this.video.volume = 0;
    const playing = this.video.play();
    if (playing) void playing.catch(() => undefined);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.video.pause();
    this.video.removeAttribute("src");
    this.video.load();
    this.texture.dispose();
  }
}
