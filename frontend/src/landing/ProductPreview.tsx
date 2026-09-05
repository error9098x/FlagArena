import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  Check,
  Flag,
  LockKeyhole,
  PencilLine,
  ShieldCheck,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { UserAvatar } from "@/components/UserAvatar";
import { TiltCard } from "@/components/ui/tilt-card";

const roles = [
  {
    id: "player",
    title: "Player",
    icon: Flag,
    name: "Arjun Mehta",
    heading: "One flag further.",
    description: "Your practice, your progress.",
    stats: [
      ["Practice score", "1,450"],
      ["Rank", "#4"],
      ["Solved", "9"],
    ],
  },
  {
    id: "author",
    title: "Author",
    icon: PencilLine,
    name: "Mira Shah",
    heading: "Build the next puzzle.",
    description: "From a first idea to a fair challenge.",
    stats: [
      ["Published", "1"],
      ["In review", "2"],
      ["Total solves", "42"],
    ],
  },
  {
    id: "admin",
    title: "Admin",
    icon: ShieldCheck,
    name: "Nisha Rao",
    heading: "A good day in the arena.",
    description: "Your community, in focus.",
    stats: [
      ["Players", "124"],
      ["Authors", "6"],
      ["To review", "2"],
    ],
  },
];
export function ProductPreview() {
  const [role, setRole] = useState("player");
  return (
    <section className="product-preview" aria-label="Interactive role preview">
      <Tabs value={role} onValueChange={setRole}>
        <TiltCard>
          <Card className="preview-window">
            <CardHeader>
              <div className="preview-toolbar">
                <span>
                  <LockKeyhole /> FlagArena / dashboard
                </span>
                <Badge variant="secondary">Example data</Badge>
              </div>
              <CardTitle className="sr-only">
                Choose your side of the arena
              </CardTitle>
              <CardDescription className="sr-only">
                Read-only examples of each role.
              </CardDescription>
              <TabsList className="preview-tabs" aria-label="Preview a role">
                {roles.map(({ id, title, icon: Icon }) => (
                  <TabsTrigger
                    key={id}
                    value={id}
                    onPointerEnter={(event) => {
                      if (event.pointerType === "mouse") setRole(id);
                    }}
                  >
                    <Icon aria-hidden="true" />
                    {title}
                  </TabsTrigger>
                ))}
              </TabsList>
            </CardHeader>
            <CardContent>
              {roles.map((view) => (
                <TabsContent key={view.id} value={view.id}>
                  <div className="preview-heading">
                    <div>
                      <p className="mb-2">
                        Welcome back, {view.name.split(" ")[0]}
                      </p>
                      <h3>{view.heading}</h3>
                      <p>{view.description}</p>
                    </div>
                    <UserAvatar
                      id={`preview-${view.id}`}
                      name={view.name}
                      size="lg"
                      className="preview-person"
                    />
                  </div>
                  <dl className="preview-metrics">
                    {view.stats.map(([title, value]) => (
                      <div key={title}>
                        <dt>{title}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs font-medium mb-1">
                    {view.id === "player"
                      ? "Pick up where you left off"
                      : view.id === "author"
                        ? "Your challenge library"
                        : "Ready for review"}
                  </p>
                  <div className="divide-y">
                    {[
                      {
                        name: "Shift register",
                        category: "crypto" as const,
                        points: 100,
                      },
                      {
                        name: "Header inspection",
                        category: "web" as const,
                        points: 150,
                      },
                      {
                        name: "Packet trail",
                        category: "forensics" as const,
                        points: 200,
                      },
                    ]
                      .filter((_, index) => view.id !== "admin" || index > 0)
                      .map((challenge, index) => (
                        <div key={challenge.name} className="preview-challenge">
                          <Flag aria-hidden="true" />
                          <div className="min-w-0 flex-1 flex flex-wrap items-center gap-2">
                            <p className="font-medium">{challenge.name}</p>
                            <ChallengeCategoryBadge
                              category={challenge.category}
                            />
                          </div>
                          {view.id === "player" ? (
                            <span className="font-mono text-xs text-muted-foreground">
                              {challenge.points} pts
                            </span>
                          ) : (
                            <Badge
                              variant={
                                view.id === "admin" || index > 0
                                  ? "warning"
                                  : "success"
                              }
                            >
                              {view.id === "admin" || index > 0
                                ? "In review"
                                : "Published"}
                            </Badge>
                          )}
                          {view.id === "player" && index === 0 && (
                            <Check
                              className="text-primary"
                              aria-label="Solved"
                            />
                          )}
                        </div>
                      ))}
                  </div>
                </TabsContent>
              ))}
            </CardContent>
            <CardFooter className="justify-between border-t gap-3">
              <span className="preview-footnote">
                A look inside. No account needed.
              </span>
              <Button variant="outline" size="sm" asChild>
                <Link to={`/preview?role=${role}`}>
                  Open preview
                  <ArrowUpRight data-icon="inline-end" />
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TiltCard>
      </Tabs>
    </section>
  );
}
