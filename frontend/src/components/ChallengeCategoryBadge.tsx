import type { ChallengeDto } from "@flagarena/shared";
import { Badge } from "@/components/ui/badge";
import { label } from "@/lib/format";

const variants = {
  crypto: "violet",
  web: "info",
  forensics: "success",
  reverse: "warning",
  pwn: "rose",
  osint: "cyan",
  misc: "secondary",
} as const;

export function ChallengeCategoryBadge({
  category,
}: {
  category: ChallengeDto["category"];
}) {
  return <Badge variant={variants[category]}>{label(category)}</Badge>;
}
