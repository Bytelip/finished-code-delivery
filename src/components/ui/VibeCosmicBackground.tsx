import React, { useEffect, useRef } from "react";

interface Star {
  x: number;
  y: number;
  radius: number;
  phase: number;
  speed: number;
  parallax: number;
  colorType: "cyan" | "emerald" | "white";
}

interface Meteor {
  x: number;
  y: number;
  length: number;
  speed: number;
  angle: number;
  opacity: number;
  color: string;
}

/**
 * GitHub Home + Linear.app + DeepMind inspired GPU-accelerated background:
 * 1. Ambient slow-breathing Aurora Mesh (#060911, indigo, cyan, emerald)
 * 2. 60fps HTML5 Canvas with 70 twinkling stars, mouse-parallax drift & shooting meteors
 * 3. 32px architectural perspective grid with radial vignette mask
 */
export function VibeCosmicBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof canvas.getContext !== "function") return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      return;
    }
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Mouse tracking with smooth lerp
    let mouseTargetX = 0;
    let mouseTargetY = 0;
    let mouseCurrentX = 0;
    let mouseCurrentY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      // Normalize from center: -1 to +1
      mouseTargetX = (e.clientX / width - 0.5) * 2;
      mouseTargetY = (e.clientY / height - 0.5) * 2;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      initStars();
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    // Generate ~70 stars
    let stars: Star[] = [];
    const initStars = () => {
      const count = 75;
      stars = [];
      for (let i = 0; i < count; i++) {
        const colorRand = Math.random();
        let colorType: "cyan" | "emerald" | "white" = "white";
        if (colorRand > 0.75) colorType = "cyan";
        else if (colorRand > 0.55) colorType = "emerald";

        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          radius: 0.6 + Math.random() * 1.2,
          phase: Math.random() * Math.PI * 2,
          speed: 0.015 + Math.random() * 0.03,
          parallax: 0.01 + Math.random() * 0.025,
          colorType,
        });
      }
    };
    initStars();

    // Shooting stars / meteors pool
    const meteors: Meteor[] = [];
    let lastMeteorTime = Date.now();
    let nextMeteorDelay = 3500 + Math.random() * 3000;

    const spawnMeteor = () => {
      const isEmerald = Math.random() > 0.5;
      meteors.push({
        x: Math.random() * (width * 0.75),
        y: Math.random() * (height * 0.35),
        length: 90 + Math.random() * 70,
        speed: 14 + Math.random() * 8,
        angle: (Math.PI / 4) * (0.85 + Math.random() * 0.3), // ~45 deg
        opacity: 0.95,
        color: isEmerald ? "#10b981" : "#38bdf8",
      });
    };

    // Main animation loop
    const render = () => {
      // Lerp mouse
      mouseCurrentX += (mouseTargetX - mouseCurrentX) * 0.05;
      mouseCurrentY += (mouseTargetY - mouseCurrentY) * 0.05;

      ctx.clearRect(0, 0, width, height);

      // Render Stars
      for (let i = 0; i < stars.length; i++) {
        const star = stars[i];
        star.phase += star.speed;
        const twinkle = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(star.phase));

        // Parallax offset
        const px = star.x + mouseCurrentX * star.parallax * 30;
        const py = star.y + mouseCurrentY * star.parallax * 30;

        ctx.beginPath();
        ctx.arc(px, py, star.radius, 0, Math.PI * 2);

        if (star.colorType === "cyan") {
          ctx.fillStyle = `rgba(56, 189, 248, ${twinkle * 0.9})`;
        } else if (star.colorType === "emerald") {
          ctx.fillStyle = `rgba(16, 185, 129, ${twinkle * 0.85})`;
        } else {
          ctx.fillStyle = `rgba(240, 246, 252, ${twinkle * 0.8})`;
        }
        ctx.fill();
      }

      // Spawn meteors periodically
      const now = Date.now();
      if (now - lastMeteorTime > nextMeteorDelay) {
        spawnMeteor();
        lastMeteorTime = now;
        nextMeteorDelay = 4000 + Math.random() * 4500;
      }

      // Render Meteors
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        const dx = Math.cos(m.angle) * m.speed;
        const dy = Math.sin(m.angle) * m.speed;

        m.x += dx;
        m.y += dy;
        m.opacity -= 0.016;

        if (m.opacity <= 0 || m.x > width + 100 || m.y > height + 100) {
          meteors.splice(i, 1);
          continue;
        }

        // Calculate tail position
        const tailX = m.x - Math.cos(m.angle) * m.length;
        const tailY = m.y - Math.sin(m.angle) * m.length;

        const grad = ctx.createLinearGradient(m.x, m.y, tailX, tailY);
        grad.addColorStop(
          0,
          m.color === "#10b981"
            ? `rgba(16, 185, 129, ${m.opacity})`
            : `rgba(56, 189, 248, ${m.opacity})`,
        );
        grad.addColorStop(1, "rgba(255, 255, 255, 0)");

        ctx.beginPath();
        ctx.moveTo(m.x, m.y);
        ctx.lineTo(tailX, tailY);
        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.6;
        ctx.lineCap = "round";
        ctx.stroke();

        // Glowing Meteor Head
        ctx.beginPath();
        ctx.arc(m.x, m.y, 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${m.opacity})`;
        ctx.fill();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#060911]"
    >
      {/* 1. Ambient GitHub Copilot-Style Aurora & Orbital Halo Mesh */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          animation: "auroraShift 18s ease-in-out infinite alternate",
          background: `
            radial-gradient(circle at 50% 12%, rgba(79, 70, 229, 0.14) 0%, transparent 60%),
            radial-gradient(circle at 18% 42%, rgba(6, 182, 212, 0.16) 0%, transparent 52%),
            radial-gradient(circle at 82% 58%, rgba(16, 185, 129, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 48% 85%, rgba(14, 165, 233, 0.08) 0%, transparent 55%)
          `,
        }}
      />

      {/* 2. Architectural 32px Perspective Grid with Vignette Mask */}
      <div
        className="absolute inset-0 opacity-55"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(56, 189, 248, 0.05) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(56, 189, 248, 0.05) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          maskImage: "radial-gradient(ellipse 75% 60% at 50% 40%, #000 60%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 75% 60% at 50% 40%, #000 60%, transparent 100%)",
        }}
      />

      {/* 3. 60fps HTML5 Canvas: Twinkling Stars & Shooting Meteors */}
      <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
    </div>
  );
}

export default VibeCosmicBackground;
