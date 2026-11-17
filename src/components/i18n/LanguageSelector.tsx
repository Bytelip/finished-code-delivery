import React, { useState, useRef, useEffect } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { useLanguage, type LanguageCode } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

export function LanguageSelector({ className }: { className?: string }) {
  const { language, setLanguage, languages } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentLang = languages.find((l) => l.code === language) || languages[0]!;

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative shrink-0 select-none", className)}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "h-8 px-2 sm:px-2.5 rounded-full border text-xs font-mono transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-sm",
          open
            ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.3)]"
            : "bg-white/[0.04] hover:bg-white/[0.08] border-white/10 text-cyan-300 hover:border-cyan-400/40",
        )}
        title="Select Language / ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ / भाषा चुनें"
        aria-label="Select Language"
      >
        <Globe className="size-3.5 text-cyan-300 shrink-0 animate-pulse" />
        <span className="font-semibold">{currentLang.nativeName}</span>
        <ChevronDown
          className={cn(
            "size-3 text-cyan-300 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 z-[200] w-52 max-h-80 overflow-y-auto rounded-xl border border-cyan-500/30 bg-[#070D19]/95 backdrop-blur-2xl p-1 shadow-[0_16px_45px_rgba(0,0,0,0.9)] divide-y divide-white/5">
          <div className="px-2.5 py-1.5 text-xs font-mono text-cyan-300 font-semibold tracking-wider uppercase flex items-center justify-between">
            <span>🌐 Select Language</span>
            <span className="text-xs text-muted-foreground">13 Native Scripts</span>
          </div>
          <div className="py-1">
            {languages.map((l) => {
              const isSelected = l.code === language;
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => {
                    setLanguage(l.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono transition-colors cursor-pointer",
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 font-bold shadow-[0_0_8px_rgba(6,182,212,0.25)]"
                      : "text-foreground hover:text-foreground hover:bg-white/10 border border-transparent",
                  )}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm">{l.flag}</span>
                    <span className="font-semibold text-foreground">{l.nativeName}</span>
                    <span className="text-xs text-muted-foreground truncate">({l.name})</span>
                  </div>
                  {isSelected && <Check className="size-3.5 text-cyan-300 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
