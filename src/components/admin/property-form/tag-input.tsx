"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface TagInputProps {
  label: string;
  tags: string[];
  onAdd: (tag: string) => void;
  onRemove: (index: number) => void;
}

export function TagInput({ label, tags, onAdd, onRemove }: TagInputProps) {
  const [inputValue, setInputValue] = useState("");

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = inputValue.trim();
      if (trimmed && !tags.includes(trimmed)) {
        onAdd(trimmed);
      }
      setInputValue("");
    }
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-[42px]">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-muted text-foreground text-xs px-2 py-1 rounded-full"
          >
            {tag}
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="text-muted-foreground hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type and press Enter to add..."
      />
    </div>
  );
}
