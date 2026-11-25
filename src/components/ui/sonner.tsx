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
            "group toast group-[.toaster]:bg-[var(--bg-surface)] group-[.toaster]:backdrop-blur-2xl group-[.toaster]:text-[var(--text-primary)] group-[.toaster]:border group-[.toaster]:border-[var(--border-subtle)] group-[.toaster]:rounded-xl group-[.toaster]:shadow-[var(--shadow-hud)] font-mono text-xs",
          description: "group-[.toast]:text-[var(--text-muted)] text-xs font-sans",
          actionButton:
            "group-[.toast]:bg-[var(--accent)] group-[.toast]:text-[var(--primary-foreground)] font-semibold",
          cancelButton:
            "group-[.toast]:bg-[var(--secondary)] group-[.toast]:text-[var(--text-primary)]",
          closeButton:
            "group-[.toast]:bg-[var(--bg-glass)] group-[.toast]:text-[var(--text-primary)] group-[.toast]:border group-[.toast]:border-[var(--border-subtle)]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
