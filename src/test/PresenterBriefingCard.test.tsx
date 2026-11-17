import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PresenterBriefingCard } from "@/components/agro/PresenterBriefingCard";

describe("PresenterBriefingCard", () => {
  const defaultProps = {
    fieldLabel: "Kolar Plateau",
    plantHealth: 84,
    activeAlerts: 2,
    onOpenBriefing: vi.fn(),
  };

  it("shows the presenter, current field snapshot, and a briefing action", () => {
    const onOpenBriefing = vi.fn();
    render(<PresenterBriefingCard {...defaultProps} onOpenBriefing={onOpenBriefing} />);

    expect(screen.getByRole("heading", { name: /Your field has a story/i })).toBeTruthy();
    expect(screen.getByText("Kolar Plateau")).toBeTruthy();
    expect(screen.getByText("84")).toBeTruthy();
    expect(screen.getByText("02")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Open field briefing/i }));
    expect(onOpenBriefing).toHaveBeenCalledOnce();
  });

  it("starts the intro on demand and lets the user turn its sound on", () => {
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue(undefined);
    render(<PresenterBriefingCard {...defaultProps} />);

    const video = document.querySelector("video");
    expect(video?.muted).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Play presenter intro/i }));
    expect(playSpy).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole("button", { name: /Unmute presenter intro/i }));
    expect(video?.muted).toBe(false);
    expect(
      screen.getByRole("button", { name: /Mute presenter intro/i }).getAttribute("aria-pressed"),
    ).toBe("true");

    playSpy.mockRestore();
  });
});
