import React, {
  Children,
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, type Transition } from "framer-motion";
import { cn } from "@/lib/utils";

export interface AnimatedBackgroundProps {
  children: ReactNode;
  defaultValue?: string | null;
  value?: string | null;
  onValueChange?: (newActiveId: string | null) => void;
  className?: string;
  transition?: Transition;
  enableHover?: boolean;
}

interface ChildProps {
  "data-id"?: string;
  className?: string;
  children?: ReactNode;
  onMouseEnter?: (e: React.MouseEvent) => void;
  onMouseLeave?: (e: React.MouseEvent) => void;
  onClick?: (e: React.MouseEvent) => void;
  [key: string]: unknown;
}

export function AnimatedBackground({
  children,
  defaultValue,
  value,
  onValueChange,
  className,
  transition = {
    type: "spring",
    bounce: 0.2,
    duration: 0.3,
  },
  enableHover = false,
}: AnimatedBackgroundProps) {
  const [activeId, setActiveId] = useState<string | null>(() => value ?? defaultValue ?? null);
  const uniqueId = useId();

  useEffect(() => {
    if (value !== undefined) {
      setActiveId(value);
    } else if (defaultValue !== undefined) {
      setActiveId(defaultValue);
    }
  }, [value, defaultValue]);

  const handleSetActiveId = (id: string | null) => {
    setActiveId(id);
    onValueChange?.(id);
  };

  return (
    <>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) {
          return child;
        }

        const childElement = child as ReactElement<ChildProps>;
        const childProps = childElement.props;
        const id = childProps["data-id"] ?? String(index);
        const isHoveredOrActive = activeId === id;

        return cloneElement(childElement, {
          key: childElement.key ?? index,
          className: cn("relative inline-flex items-center justify-center", childProps.className),
          "data-checked": isHoveredOrActive ? "true" : "false",
          onMouseEnter: (e: React.MouseEvent) => {
            childProps.onMouseEnter?.(e);
            if (enableHover) {
              handleSetActiveId(id);
            }
          },
          onMouseLeave: (e: React.MouseEvent) => {
            childProps.onMouseLeave?.(e);
            if (enableHover) {
              handleSetActiveId(value ?? defaultValue ?? null);
            }
          },
          onClick: (e: React.MouseEvent) => {
            handleSetActiveId(id);
            childProps.onClick?.(e);
          },
          children: (
            <>
              <AnimatePresence initial={false}>
                {isHoveredOrActive && (
                  <motion.div
                    layoutId={`animated-bg-${uniqueId}`}
                    className={cn("absolute inset-0 pointer-events-none -z-0", className)}
                    transition={transition}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}
              </AnimatePresence>
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {childProps.children}
              </span>
            </>
          ),
        });
      })}
    </>
  );
}

export default AnimatedBackground;
