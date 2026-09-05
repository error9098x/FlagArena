import * as React from "react";
import { Select as Primitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "cn";

export const Select = Primitive.Root;
export const SelectGroup = Primitive.Group;
export const SelectValue = Primitive.Value;
export function SelectTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Trigger>) {
  return (
    <Primitive.Trigger
      data-slot="select-trigger"
      className={cn(
        "flex h-10 w-full items-center justify-between gap-3 rounded-md border border-input bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:truncate",
        className,
      )}
      {...props}
    >
      {children}
      <Primitive.Icon asChild>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </Primitive.Icon>
    </Primitive.Trigger>
  );
}
export function SelectContent({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        position="popper"
        sideOffset={6}
        data-slot="select-content"
        className={cn(
          "z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border bg-popover text-popover-foreground shadow-xl",
          className,
        )}
        {...props}
      >
        <Primitive.ScrollUpButton className="flex justify-center py-1">
          <ChevronUp className="size-4" />
        </Primitive.ScrollUpButton>
        <Primitive.Viewport className="p-1">{children}</Primitive.Viewport>
        <Primitive.ScrollDownButton className="flex justify-center py-1">
          <ChevronDown className="size-4" />
        </Primitive.ScrollDownButton>
      </Primitive.Content>
    </Primitive.Portal>
  );
}
export function SelectItem({
  children,
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Item>) {
  return (
    <Primitive.Item
      className={cn(
        "relative flex cursor-default select-none items-center rounded-md py-2 pl-3 pr-9 text-sm outline-none data-[highlighted]:bg-accent data-[disabled]:opacity-50",
        className,
      )}
      {...props}
    >
      <Primitive.ItemText>{children}</Primitive.ItemText>
      <Primitive.ItemIndicator className="absolute right-3 text-primary">
        <Check className="size-4" />
      </Primitive.ItemIndicator>
    </Primitive.Item>
  );
}
