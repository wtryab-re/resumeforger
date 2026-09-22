import React, { useEffect, useState } from "react";

interface DelimitedListInputProps
  extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"> {
  items: string[] | undefined;
  onChange: (items: string[]) => void;
  /** "," for tag-style lists (skills), "\n" for one-item-per-line lists (bullets). */
  delimiter: "," | "\n";
}

const parse = (text: string, delimiter: string) =>
  text.split(delimiter).map((s) => s.trim()).filter(Boolean);

/**
 * A textarea bound to a string[]. It keeps the user's raw text as its own
 * state and only derives the array from it, so typing a trailing comma, a
 * space or a new line isn't stripped and re-rendered mid-keystroke (which
 * used to block those keys and push the caret to the end).
 */
export const DelimitedListInput: React.FC<DelimitedListInputProps> = ({
  items,
  onChange,
  delimiter,
  ...textareaProps
}) => {
  const joiner = delimiter === "," ? ", " : "\n";
  const [draft, setDraft] = useState(() => (items || []).join(joiner));

  // Adopt outside changes (profile loaded, cleared, synced from the cloud),
  // but leave the draft alone when it already describes the same list.
  useEffect(() => {
    const next = items || [];
    const current = parse(draft, delimiter);
    if (current.length !== next.length || current.some((item, i) => item !== next[i])) {
      setDraft(next.join(joiner));
    }
  }, [items]);

  return (
    <textarea
      {...textareaProps}
      value={draft}
      onChange={(e) => {
        setDraft(e.target.value);
        onChange(parse(e.target.value, delimiter));
      }}
    />
  );
};
