import * as React from "react";
import { Slot } from "radix-ui";
import { cn } from "cn";

type RainbowButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
};

function RainbowButton({
  className,
  asChild = false,
  ...props
}: RainbowButtonProps) {
  const Comp = asChild ? Slot.Root : "button";

  return (
    <Comp
      data-slot="button"
      className={cn("rainbow-button", className)}
      {...props}
    />
  );
}

export { RainbowButton, type RainbowButtonProps };
