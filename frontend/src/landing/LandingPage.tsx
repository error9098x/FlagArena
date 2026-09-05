import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Flag,
  Fingerprint,
  Server,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import type { ChallengeDto, EventDto } from "@flagarena/shared";
import { useRef } from "react";
import { useSession } from "@/auth/SessionProvider";
import { http } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { PlatformBento } from "./PlatformBento";
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { RainbowButton } from "@/components/ui/rainbow-button";
import { CipherBackground } from "./CipherBackground";
import { CipherWordmark } from "./CipherWordmark";
import { ProductPreview } from "./ProductPreview";
import "./landing.css";

interface HomeData {
  challenges: ChallengeDto[];
  events: EventDto[];
}

export function LandingPage() {
  const { user } = useSession();
  const footerBoundaryRef = useRef<HTMLElement>(null);
  const query = useQuery({
    queryKey: ["public-home"],
    queryFn: async () => (await http.get<HomeData>("/public/home")).data,
  });
  return (
    <div className="landing">
      <CipherBackground fadeAfter={footerBoundaryRef} />
      <div className="landing-container">
        <header className="landing-nav">
          <Link className="wordmark" to="/">
            Flag<span>Arena</span>
          </Link>
          <nav
            aria-label="Public navigation"
            className="flex items-center gap-3 sm:gap-6"
          >
            <a href="#platform" className="hidden md:inline">
              The platform
            </a>
            <Link to="/preview" className="hidden sm:inline">
              Live preview
            </Link>
            <Button variant="outline" asChild>
              <Link to={user ? "/dashboard" : "/login"}>
                {user ? "Dashboard" : "Log in"}
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </nav>
        </header>
        <main id="main-content">
          <section className="landing-hero">
            <div className="hero-copy">
              <Badge variant="success">
                <Server /> Self-hosted. Community-driven.
              </Badge>
              <h1>
                Your arena.
                <br />
                <span>Your rules.</span>
              </h1>
              <p className="hero-description">
                A home for curious minds and good challenges. Run your own CTFs,
                build a practice library, and give every flag a place to count.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link to={user ? "/dashboard" : "/register"}>
                    {user ? "Open dashboard" : "Create account"}
                    <ArrowRight data-icon="inline-end" />
                  </Link>
                </Button>
                <RainbowButton asChild>
                  <Link to="/preview">
                    Explore the demo
                    <ArrowUpRight data-icon="inline-end" />
                  </Link>
                </RainbowButton>
              </div>
              <p className="hero-footnote">
                <ShieldCheck aria-hidden="true" /> Your infrastructure. Your
                players. Your data.
              </p>
            </div>
            <ProductPreview />
          </section>
          <section id="platform" className="landing-platform">
            <div className="section-heading">
              <div>
                <p className="eyebrow">FROM FIRST SOLVE TO FINAL SCORE</p>
                <h2>
                  Everything a good CTF needs.
                  <br />
                  <span className="text-muted-foreground">
                    Nothing between you and the flag.
                  </span>
                </h2>
              </div>
              <p className="section-description">
                One focused platform for the people who play, the people who
                build, and the people who bring everyone together.
              </p>
            </div>
            <PlatformBento />
          </section>
          <section id="explore" className="landing-explore">
            <div className="section-heading">
              <div>
                <p className="eyebrow">ON THIS INSTANCE</p>
                <h2>Start with one good puzzle.</h2>
              </div>
              <Button variant="outline" asChild>
                <Link to="/challenges">
                  Browse challenges
                  <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
            </div>
            {query.data?.challenges.length ? (
              <div className="grid gap-4 sm:grid-cols-[repeat(auto-fit,minmax(260px,1fr))]">
                {query.data.challenges.map((challenge) => (
                  <Card key={challenge.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between gap-2 mb-4">
                        <ChallengeCategoryBadge category={challenge.category} />
                        <Flag
                          className="size-4 text-muted-foreground"
                          aria-hidden="true"
                        />
                      </div>
                      <CardTitle>
                        <Link
                          className="record-title"
                          to={`/challenges/${challenge.id}`}
                        >
                          {challenge.title}
                        </Link>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="challenge-points">
                        {challenge.basePoints}
                        <span> points</span>
                      </p>
                    </CardContent>
                    <CardFooter className="mt-auto">
                      <Button variant="secondary" asChild className="w-full">
                        <Link to={`/challenges/${challenge.id}`}>
                          Open challenge
                          <ArrowUpRight data-icon="inline-end" />
                        </Link>
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-muted-foreground">
                    {query.isPending
                      ? "Finding the latest challenges…"
                      : query.error
                        ? "We couldn't load this instance's challenges. Please try again shortly."
                        : "The first challenges will appear here when your community publishes them."}
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
          <section ref={footerBoundaryRef} className="landing-cta">
            <div>
              <p className="eyebrow">TAKE A LOOK AROUND</p>
              <h2>See the arena from every side.</h2>
              <p>
                Explore player, author, and admin dashboards. No account or
                setup needed.
              </p>
            </div>
            <Button size="lg" asChild>
              <Link to="/preview">
                Preview the dashboard
                <ArrowUpRight data-icon="inline-end" />
              </Link>
            </Button>
          </section>
        </main>
        <footer className="landing-footer">
          <div className="footer-top">
            <div>
              <Link to="/" className="wordmark">
                Flag<span>Arena</span>
              </Link>
              <p>A self-hosted home for hands-on security.</p>
            </div>
            <nav aria-label="Footer navigation">
              <Link to="/preview">Platform preview</Link>
              <Link to="/register">Create account</Link>
              <Link to="/login">Log in</Link>
              <Button variant="outline" size="sm" asChild>
                <Link to="/admin/login">
                  <ShieldCheck data-icon="inline-start" />
                  Admin log in
                </Link>
              </Button>
            </nav>
          </div>
          <CipherWordmark />
        </footer>
      </div>
    </div>
  );
}
