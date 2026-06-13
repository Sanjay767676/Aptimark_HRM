import { Loader2Icon } from "lucide-react";

import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";

function Spinner({ className, size = "md", ...props }: React.ComponentProps<"svg"> & { size?: SpinnerSize }) {
  const sizeClass = size === "sm" ? "size-4" : size === "lg" ? "size-8" : "size-5";

  return (
    <Loader2Icon
      role="status"
      aria-label="Loading"
      className={cn(sizeClass, "animate-spin", className)}
      {...props}
    />
  );
}

export { Spinner };
