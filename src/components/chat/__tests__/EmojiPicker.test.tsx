import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import EmojiPicker from "@/components/chat/EmojiPicker";

describe("EmojiPicker", () => {
  it("should render the trigger button", () => {
    render(<EmojiPicker onEmojiSelect={() => {}} />);
    // The button has a Smile icon
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBeGreaterThanOrEqual(1);
  });

  it("should call onEmojiSelect when an emoji is clicked", async () => {
    const onSelect = vi.fn();
    render(<EmojiPicker onEmojiSelect={onSelect} />);
    
    // Open the popover
    const trigger = screen.getAllByRole("button")[0];
    fireEvent.click(trigger);
    
    // The emoji also appears as a category icon: click the one in the grid (last occurrence).
    const matches = await screen.findAllByText("😀");
    fireEvent.click(matches[matches.length - 1]);
    
    expect(onSelect).toHaveBeenCalledWith("😀");
  });
});
