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
    
    // Find and click an emoji
    const emojiButtons = await screen.findAllByText("😀");
    // Click the one in the grid (last one), not the category tab
    fireEvent.click(emojiButtons[emojiButtons.length - 1]);
    
    expect(onSelect).toHaveBeenCalledWith("😀");
  });
});
