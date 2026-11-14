import { HazardAlertCenter } from "@/components/HazardAlertCenter";
import type { AgroTelemetry, HazardAlert } from "@/types/agroSpace";

export function HazardMatrixSlot({
  hazards,
  telemetry,
  variant = "summary",
}: {
  hazards: HazardAlert[];
  telemetry?: AgroTelemetry;
  variant?: "summary" | "full";
}) {
  return <HazardAlertCenter hazards={hazards} telemetry={telemetry} variant={variant} />;
}
