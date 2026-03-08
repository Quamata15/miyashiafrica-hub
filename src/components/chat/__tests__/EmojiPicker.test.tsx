import { describe, it, expect } from "vitest";
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
    const emojiButton = await screen.findByText("😀");
    fireEvent.click(emojiButton);
    
    expect(onSelect).toHaveBeenCalledWith("😀");
  });
});
