import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

const emojiCategories = [
  {
    label: "😀",
    emojis: ["😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏", "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕"],
  },
  {
    label: "👋",
    emojis: ["👋", "🤚", "🖐", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇", "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "💪"],
  },
  {
    label: "❤️",
    emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝", "💟", "🔥", "⭐", "🌟", "✨", "💫", "🎉", "🎊", "🎁", "🏆", "🥇"],
  },
  {
    label: "🛒",
    emojis: ["🛒", "📦", "🚚", "💰", "💵", "💳", "🏪", "🏬", "📱", "💻", "⌚", "👗", "👟", "🎒", "👜", "🧢", "🍽️", "☕", "🍕", "🍔", "🎂", "🏠", "🔑", "📍", "✅", "❌", "⚠️", "📝", "📎"],
  },
];

interface EmojiPickerProps {
  onEmojiSelect: (emoji: string) => void;
}

const EmojiPicker = ({ onEmojiSelect }: EmojiPickerProps) => {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  const handleSelect = (emoji: string) => {
    onEmojiSelect(emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0">
          <Smile className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-2" side="top" align="end">
        {/* Category tabs */}
        <div className="flex gap-1 mb-2 border-b border-border pb-2">
          {emojiCategories.map((cat, i) => (
            <Button
              key={i}
              variant={activeTab === i ? "default" : "ghost"}
              size="sm"
              className="h-8 w-8 p-0 text-lg"
              onClick={() => setActiveTab(i)}
            >
              {cat.label}
            </Button>
          ))}
        </div>
        <ScrollArea className="h-48">
          <div className="grid grid-cols-8 gap-1">
            {emojiCategories[activeTab].emojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleSelect(emoji)}
                className="h-8 w-8 flex items-center justify-center text-lg hover:bg-muted rounded-md transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default EmojiPicker;
