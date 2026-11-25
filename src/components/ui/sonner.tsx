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
            "group toast group-[.toaster]:bg-[#1c1c1c] group-[.toaster]:text-[#ededed] group-[.toaster]:border group-[.toaster]:border-white/[0.1] group-[.toaster]:rounded-lg group-[.toaster]:shadow-[0_14px_40px_rgba(0,0,0,0.7)] font-sans text-xs",
          description: "group-[.toast]:text-[#8b8b8b] text-xs font-sans",
          actionButton:
            "group-[.toast]:bg-[#3ecf8e] group-[.toast]:text-[#121212] font-semibold hover:group-[.toast]:bg-[#24b47e]",
          cancelButton: "group-[.toast]:bg-[#262626] group-[.toast]:text-[#ededed]",
          closeButton:
            "group-[.toast]:bg-[#242424] group-[.toast]:text-[#ededed] group-[.toast]:border group-[.toast]:border-white/[0.1] group-[.toast]:hover:bg-[#2d2d2d]",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
