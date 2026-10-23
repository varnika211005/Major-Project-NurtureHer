import { HTMLAttributes } from "react";
import { HTMLMotionProps, motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "gradient-border surface-shine rounded-card bg-surface/85 p-5 shadow-card backdrop-blur-2xl transition duration-300 md:p-6",
        className,
      )}
      {...props}
    />
  );
}

export function MotionCard({ className, ...props }: HTMLMotionProps<"div">) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className={cn(
        "gradient-border surface-shine rounded-card bg-surface/85 p-5 shadow-card backdrop-blur-2xl md:p-6",
        className,
      )}
      {...props}
    />
  );
}
