import * as SelectPrimitive from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";

export function LanguageSelect() {
  return (
    <SelectPrimitive.Root defaultValue="en">
      <SelectPrimitive.Trigger className="inline-flex h-11 items-center gap-2 rounded-2xl border border-pink-100 bg-white/80 px-3 text-sm font-semibold text-ink shadow-sm outline-none dark:border-white/10 dark:bg-white/10 dark:text-white">
        <SelectPrimitive.Value />
        <SelectPrimitive.Icon>
          <ChevronDown className="h-4 w-4" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content className="z-50 overflow-hidden rounded-2xl border border-pink-100 bg-white p-1 shadow-card">
          {[
            ["en", "English"],
            ["kn", "Kannada"],
            ["hi", "Hindi"],
            ["ta", "Tamil"],
            ["te", "Telugu"],
          ].map(([value, label]) => (
            <SelectPrimitive.Item key={value} value={value} className="cursor-pointer rounded-xl px-3 py-2 text-sm outline-none hover:bg-pink-50">
              <SelectPrimitive.ItemText>{label}</SelectPrimitive.ItemText>
            </SelectPrimitive.Item>
          ))}
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
