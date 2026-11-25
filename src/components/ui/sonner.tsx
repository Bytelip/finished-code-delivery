import { Toaster as Sonner } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="bottom-right"
      closeButton
      duration={2500}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-[#0B1324]/95 group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-cyan-300 group-[.toaster]:border group-[.toaster]:border-cyan-500/30 group-[.toaster]:rounded-xl group-[.toaster]:shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(6,182,212,0.25)] font-mono text-xs",
          description: "group-[.toast]:text-foreground text-xs font-sans",
          actionButton:
            "group-[.toast]:bg-cyan-500 group-[.toast]:text-muted-foreground font-semibold",
          cancelButton: "group-[.toast]:bg-slate-800 group-[.toast]:text-foreground",
          closeButton:
            "group-[.toast]:bg-white/10 group-[.toast]:text-foreground group-[.toast]:border group-[.toast]:border-white/20 group-[.toast]:hover:bg-white/20",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
