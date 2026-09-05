import { useMemo } from "react";
import { Avatar as GeneratedAvatar } from "@dicebear/core";
import identicon from "@dicebear/styles/identicon.json";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export function UserAvatar({
  id,
  name,
  size = "default",
  className,
}: {
  id: string;
  name: string;
  size?: "sm" | "default" | "lg";
  className?: string;
}) {
  const source = useMemo(
    () => new GeneratedAvatar(identicon, { seed: id, size: 80 }).toDataUri(),
    [id],
  );
  return (
    <Avatar size={size} className={className}>
      <AvatarImage src={source} alt="" />
      <AvatarFallback>{name.slice(0, 2).toUpperCase()}</AvatarFallback>
    </Avatar>
  );
}
