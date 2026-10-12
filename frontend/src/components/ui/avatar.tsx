import * as AvatarPrimitive from "@radix-ui/react-avatar";

export function Avatar({ initials = "NH" }: { initials?: string }) {
  return (
    <AvatarPrimitive.Root className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-primary to-accent text-sm font-bold text-white shadow-card">
      <AvatarPrimitive.Fallback>{initials}</AvatarPrimitive.Fallback>
    </AvatarPrimitive.Root>
  );
}
