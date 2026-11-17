import { useRef, useState } from "react";
import { ArrowUpRight, Pause, Play, Sparkles, Volume2, VolumeX } from "lucide-react";

const PRESENTER_VIDEO = `${import.meta.env.BASE_URL}agrospace-presenter-intro.mp4`;
const PRESENTER_POSTER = `${import.meta.env.BASE_URL}agrospace-presenter-poster.webp`;

interface PresenterBriefingCardProps {
  fieldLabel: string;
  plantHealth: number;
  activeAlerts: number;
  onOpenBriefing: () => void;
}

function formatTime(seconds: number): string {
  const safeSeconds = Number.isFinite(seconds) ? Math.floor(seconds) : 0;
  return `0:${safeSeconds.toString().padStart(2, "0")}`;
}

export function PresenterBriefingCard({
  fieldLabel,
  plantHealth,
  activeAlerts,
  onOpenBriefing,
}: PresenterBriefingCardProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(5);
  const [mediaError, setMediaError] = useState(false);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().catch(() => setMediaError(true));
    } else {
      video.pause();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  const seek = (value: string) => {
    const video = videoRef.current;
    const nextTime = Number(value);
    if (!video || !Number.isFinite(nextTime)) return;
    video.currentTime = nextTime;
    setCurrentTime(nextTime);
  };

  return (
    <section aria-labelledby="presenter-briefing-title" className="group relative isolate">
      <div className="pointer-events-none absolute -inset-1 -z-10 rounded-[2rem] bg-cyan-400/10 blur-2xl transition-opacity duration-500 group-hover:opacity-100" />
      <div className="group relative overflow-hidden rounded-[1.75rem] border border-cyan-300/20 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.34),0_0_45px_rgba(34,211,238,0.06)] backdrop-blur-md transition-all duration-300 hover:-translate-y-0.5 hover:border-cyan-300/35 hover:shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_55px_rgba(34,211,238,0.1)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_15%_0%,rgba(34,211,238,0.10),transparent_42%),radial-gradient(ellipse_at_100%_100%,rgba(99,102,241,0.10),transparent_40%)]" />

        <div className="relative grid lg:grid-cols-[minmax(0,1.02fr)_minmax(0,0.98fr)]">
          <div className="min-w-0 p-3 sm:p-4 lg:p-5">
            <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-[#050b15] shadow-[0_12px_36px_rgba(0,0,0,0.35)]">
              {mediaError ? (
                <img
                  src={PRESENTER_POSTER}
                  alt="AgroSpace Nexus field presenter"
                  className="absolute inset-0 size-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={PRESENTER_VIDEO}
                  poster={PRESENTER_POSTER}
                  muted={isMuted}
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Short introduction from the AgroSpace Nexus presenter"
                  className="absolute inset-0 size-full object-cover"
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
                  onLoadedMetadata={(event) => {
                    const videoDuration = event.currentTarget.duration;
                    if (Number.isFinite(videoDuration) && videoDuration > 0) {
                      setDuration(videoDuration);
                    }
                  }}
                  onError={() => setMediaError(true)}
                />
              )}

              <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-slate-950/55 to-transparent" />
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-slate-950/65 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-100 shadow-lg backdrop-blur-md sm:left-4 sm:top-4 sm:text-[10px]">
                <Sparkles aria-hidden="true" className="size-3 text-cyan-300" />
                Nexus field guide
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3 rounded-xl border border-white/[0.08] bg-slate-950/65 px-3 py-2.5 sm:px-3.5">
              <button
                type="button"
                onClick={togglePlayback}
                disabled={mediaError}
                aria-label={isPlaying ? "Pause presenter intro" : "Play presenter intro"}
                title={isPlaying ? "Pause intro" : "Play intro"}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-cyan-300/25 bg-cyan-300/10 text-cyan-100 transition-colors hover:border-cyan-200/60 hover:bg-cyan-300/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPlaying ? (
                  <Pause aria-hidden="true" className="size-4 fill-current" />
                ) : (
                  <Play aria-hidden="true" className="ml-0.5 size-4 fill-current" />
                )}
              </button>

              <span
                className="w-[4.2rem] shrink-0 font-mono text-[10px] tabular-nums text-slate-400"
                aria-live="off"
              >
                {formatTime(currentTime)} <span className="text-slate-600">/</span>{" "}
                {formatTime(duration)}
              </span>

              <input
                aria-label="Seek presenter intro"
                type="range"
                min={0}
                max={duration || 5}
                step={0.1}
                value={Math.min(currentTime, duration || 5)}
                onChange={(event) => seek(event.target.value)}
                disabled={mediaError}
                className="h-1 min-w-0 flex-1 cursor-pointer accent-cyan-300 disabled:cursor-not-allowed"
              />

              <button
                type="button"
                onClick={toggleMute}
                disabled={mediaError}
                aria-label={isMuted ? "Unmute presenter intro" : "Mute presenter intro"}
                aria-pressed={!isMuted}
                title={isMuted ? "Turn sound on" : "Mute sound"}
                className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isMuted ? (
                  <VolumeX aria-hidden="true" className="size-4" />
                ) : (
                  <Volume2 aria-hidden="true" className="size-4" />
                )}
              </button>
            </div>
            <p className="mt-2 px-1 text-[10px] font-mono uppercase tracking-[0.14em] text-slate-500">
              Short intro <span className="mx-1.5 text-cyan-300/60">/</span> Sound starts muted
            </p>
          </div>

          <div className="flex min-w-0 flex-col justify-center px-5 pb-6 pt-3 sm:px-7 sm:pb-7 lg:px-9 lg:py-8 xl:px-11">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/75">
                Field intelligence <span className="text-white/25">/</span> AG-01
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300/15 bg-emerald-300/[0.06] px-2.5 py-1 font-mono text-[9px] font-semibold uppercase tracking-[0.13em] text-emerald-200/90">
                <span className="relative flex size-1.5">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300/55 motion-reduce:animate-none" />
                  <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
                </span>
                Guide ready
              </span>
            </div>

            <h2
              id="presenter-briefing-title"
              className="mt-5 max-w-xl font-space text-2xl font-semibold leading-[1.12] tracking-[-0.035em] text-white sm:text-3xl lg:mt-6 lg:text-[2.15rem]"
            >
              Your field has a story. <span className="text-cyan-200">Let’s read it.</span>
            </h2>
            <p className="mt-3 max-w-lg text-sm leading-6 text-slate-300/80 sm:text-[15px]">
              Meet your AgroSpace guide, then move from a clear overview into the signals shaping
              this field today.
            </p>

            <div className="mt-6 grid grid-cols-3 divide-x divide-white/[0.08] rounded-2xl border border-white/[0.08] bg-white/[0.025] py-3">
              <div className="min-w-0 px-3 sm:px-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">
                  Field
                </p>
                <p
                  className="mt-1 truncate text-xs font-medium text-slate-100 sm:text-sm"
                  title={fieldLabel}
                >
                  {fieldLabel || "Current field"}
                </p>
              </div>
              <div className="min-w-0 px-3 sm:px-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">
                  Plant health
                </p>
                <p className="mt-1 text-xs font-semibold tabular-nums text-emerald-200 sm:text-sm">
                  {Math.round(plantHealth)}
                  <span className="ml-0.5 text-slate-500">/100</span>
                </p>
              </div>
              <div className="min-w-0 px-3 sm:px-4">
                <p className="font-mono text-[9px] uppercase tracking-[0.13em] text-slate-500">
                  Active alerts
                </p>
                <p
                  className={`mt-1 text-xs font-semibold tabular-nums sm:text-sm ${activeAlerts > 0 ? "text-amber-200" : "text-slate-100"}`}
                >
                  {activeAlerts.toString().padStart(2, "0")}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onOpenBriefing}
                className="group/cta inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_8px_28px_rgba(34,211,238,0.18)] transition-all hover:-translate-y-0.5 hover:bg-cyan-200 hover:shadow-[0_10px_32px_rgba(34,211,238,0.28)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-100 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Open field briefing
                <ArrowUpRight
                  aria-hidden="true"
                  className="size-4 transition-transform group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5"
                />
              </button>
              <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-slate-500">
                Built for the AgroSpace console
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
