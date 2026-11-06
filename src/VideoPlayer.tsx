import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { Maximize2, Minimize2, Pause, Play, Volume2, VolumeX } from "lucide-react";

function clock(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/**
 * A quiet video player: the film sits in a rounded frame with no browser
 * chrome. Before it starts there is one play button; once it plays, a thin
 * glass bar (play, time, scrubber, sound, full screen) slides away while the
 * pointer is still and comes back when it moves.
 */
export default function VideoPlayer({
  src,
  poster,
  title,
}: {
  src: string;
  poster?: string;
  title: string;
}) {
  const shell = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const idleTimer = useRef(0);
  const scrubbing = useRef(false);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [portrait, setPortrait] = useState(false);
  const [idle, setIdle] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [error, setError] = useState(false);

  // The progress line follows the playhead every frame without re-rendering.
  const paintBar = useCallback(() => {
    const element = video.current;
    if (!element || !bar.current || !element.duration) return;
    bar.current.style.setProperty("--played", String(element.currentTime / element.duration));
    if (element.buffered.length)
      bar.current.style.setProperty(
        "--loaded",
        String(element.buffered.end(element.buffered.length - 1) / element.duration),
      );
  }, []);
  useEffect(() => {
    let frame = 0;
    const loop = () => {
      paintBar();
      frame = requestAnimationFrame(loop);
    };
    if (playing) frame = requestAnimationFrame(loop);
    else paintBar();
    return () => cancelAnimationFrame(frame);
  }, [playing, playing ? 0 : time, started, paintBar]);

  useEffect(() => {
    const update = () => setFullscreen(document.fullscreenElement === shell.current);
    document.addEventListener("fullscreenchange", update);
    return () => {
      document.removeEventListener("fullscreenchange", update);
      window.clearTimeout(idleTimer.current);
    };
  }, []);

  const wake = useCallback(() => {
    setIdle(false);
    window.clearTimeout(idleTimer.current);
    idleTimer.current = window.setTimeout(() => {
      if (!shell.current?.querySelector(".player-bar:hover, .player-bar :focus-visible"))
        setIdle(true);
    }, 2200);
  }, []);

  const toggle = useCallback(() => {
    const element = video.current;
    if (!element) return;
    if (element.paused || element.ended) {
      setStarted(true);
      void element.play().catch(() => setPlaying(false));
    } else element.pause();
    wake();
  }, [wake]);

  const seekTo = useCallback((seconds: number) => {
    const element = video.current;
    if (!element || !element.duration) return;
    element.currentTime = Math.min(element.duration, Math.max(0, seconds));
    setTime(element.currentTime);
  }, []);

  const seekFromPointer = (event: PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    seekTo(ratio * (video.current?.duration ?? 0));
  };

  const toggleMute = () => {
    const element = video.current;
    if (!element) return;
    element.muted = !element.muted;
    setMuted(element.muted);
  };

  const toggleFullscreen = () => {
    const element = shell.current;
    const media = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (element?.requestFullscreen) void element.requestFullscreen();
    else media?.webkitEnterFullscreen?.();
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const target = event.target as HTMLElement;
    if (target.getAttribute("role") === "slider" && event.key.startsWith("Arrow")) {
      wake();
      return;
    }
    const key = event.key.toLowerCase();
    if (key === " " || key === "k") {
      if (target.tagName === "BUTTON" && key === " ") return;
      event.preventDefault();
      if (event.repeat) return;
      toggle();
    } else if (key === "m") toggleMute();
    else if (key === "f") toggleFullscreen();
    else if (key === "arrowright") seekTo((video.current?.currentTime ?? 0) + 5);
    else if (key === "arrowleft") seekTo((video.current?.currentTime ?? 0) - 5);
    else return;
    wake();
  };

  const showChrome = !playing || !idle;

  return (
    <div
      ref={shell}
      className="player"
      data-started={started}
      data-playing={playing}
      data-chrome={showChrome}
      data-portrait={portrait}
      tabIndex={-1}
      onPointerMove={wake}
      onPointerLeave={(event) => event.pointerType === "mouse" && playing && setIdle(true)}
      onFocus={wake}
      onKeyDown={onKey}
    >
      <video
        ref={video}
        className="player-video"
        playsInline
        preload="metadata"
        poster={poster}
        src={src}
        aria-label={`${title} video`}
        onClick={() => {
          toggle();
          shell.current?.focus({ preventScroll: true });
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setIdle(false);
        }}
        onTimeUpdate={(event) => setTime(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) => {
          const element = event.currentTarget;
          setDuration(element.duration);
          setPortrait(element.videoHeight > element.videoWidth);
        }}
        onVolumeChange={(event) => setMuted(event.currentTarget.muted)}
        onProgress={paintBar}
        onError={() => setError(true)}
      />
      <div className="player-shade" aria-hidden="true" />

      {!started && !error && (
        <button
          className="player-start"
          onClick={() => {
            toggle();
            shell.current?.focus({ preventScroll: true });
          }}
          aria-label={`Play ${title}`}
        >
          <span className="player-start-icon">
            <Play size={22} fill="currentColor" strokeWidth={0} />
          </span>
          <span className="player-start-label">
            Play film
            {duration ? <em>{clock(duration)}</em> : null}
          </span>
        </button>
      )}

      {started && (
        <div className="player-bar">
          <button
            className="player-icon"
            onClick={toggle}
            aria-label={playing ? "Pause" : "Play"}
          >
            {playing ? (
              <Pause size={16} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play size={16} fill="currentColor" strokeWidth={0} />
            )}
          </button>
          <span className="player-time">
            {clock(time)} <i>/</i> <span>{clock(duration)}</span>
          </span>
          <div
            ref={bar}
            className="player-scrub"
            role="slider"
            tabIndex={0}
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
            aria-valuenow={Math.round(time)}
            aria-valuetext={`${clock(time)} of ${clock(duration)}`}
            onPointerDown={(event) => {
              if (event.button !== 0) return;
              scrubbing.current = true;
              event.currentTarget.setPointerCapture(event.pointerId);
              seekFromPointer(event);
            }}
            onPointerMove={(event) => scrubbing.current && seekFromPointer(event)}
            onPointerUp={() => (scrubbing.current = false)}
            onPointerCancel={() => (scrubbing.current = false)}
            onLostPointerCapture={() => (scrubbing.current = false)}
            onKeyDown={(event) => {
              if (event.key === "ArrowRight") seekTo(time + 5);
              else if (event.key === "ArrowLeft") seekTo(time - 5);
              else if (event.key === "Home") seekTo(0);
              else if (event.key === "End") seekTo(duration);
              else return;
              event.preventDefault();
            }}
          >
            <span className="player-track" aria-hidden="true">
              <span className="player-loaded" />
              <span className="player-played" />
            </span>
          </div>
          <button
            className="player-icon"
            onClick={toggleMute}
            aria-label={muted ? "Turn sound on" : "Mute"}
          >
            {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
          <button
            className="player-icon"
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
          </button>
        </div>
      )}

      {error && (
        <p className="player-error" role="status">
          This video could not load.{" "}
          <a href={src} target="_blank" rel="noopener noreferrer">
            Open it directly
          </a>
          .
        </p>
      )}
    </div>
  );
}
