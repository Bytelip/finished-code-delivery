import { GlobeViewport, type GlobeViewportProps } from "@/components/GlobeViewport";

export { GlobeViewport } from "@/components/GlobeViewport";

export function GlobeContainer(props: GlobeViewportProps) {
  return <GlobeViewport {...props} />;
}
