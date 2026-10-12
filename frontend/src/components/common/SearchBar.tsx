import { InputHTMLAttributes } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SearchBar({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative min-w-0 flex-1", className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <Input className="h-12 rounded-[20px] bg-white/86 pl-11 shadow-soft" {...props} />
    </div>
  );
}
