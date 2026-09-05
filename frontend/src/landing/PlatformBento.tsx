import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  FileCode2,
  CalendarDays,
  Trophy,
  Server,
  Database,
  Users,
  FolderLock,
} from "lucide-react";
import type { ReactNode } from "react";
import { ChallengeCategoryBadge } from "@/components/ChallengeCategoryBadge";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/UserAvatar";

// Magic UI BentoCard composition, adapted for FlagArena's product previews.
function Feature({
  title,
  description,
  icon,
  href,
  cta,
  wide,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  cta: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <article
      className={`platform-feature${wide ? " platform-feature-wide" : ""}`}
    >
      <div className="feature-scene">{children}</div>
      <div className="feature-copy">
        <span className="feature-icon" aria-hidden="true">
          {icon}
        </span>
        <h3>{title}</h3>
        <p>{description}</p>
        <Button variant="link" asChild className="feature-link">
          <Link to={href}>
            {cta}
            <ArrowUpRight />
          </Link>
        </Button>
      </div>
    </article>
  );
}

const files = [
  {
    name: "headers.http",
    category: "web",
    text: "The response tells a different story.",
    points: 150,
  },
  {
    name: "capture.pcap",
    category: "forensics",
    text: "Follow the trail, one packet at a time.",
    points: 200,
  },
  {
    name: "cipher.txt",
    category: "crypto",
    text: "A familiar message. An unfamiliar alphabet.",
    points: 100,
  },
] as const;

export function PlatformBento() {
  return (
    <div className="platform-bento">
      <Feature
        title="One file. A hundred possibilities."
        description="Build a practice library with downloadable challenges, optional hints, and a new reason to keep learning."
        icon={<FileCode2 />}
        href="/challenges"
        cta="Explore challenges"
        wide
      >
        <div className="scene-caption">
          THE CHALLENGE LIBRARY <span>Sample files</span>
        </div>
        <div className="file-marquee">
          <div className="file-track">
            {[0, 1].map((copy) => (
              <div
                className="file-set"
                key={copy}
                aria-hidden={copy === 1 ? true : undefined}
              >
                {files.map((file) => (
                  <div className="file-preview" key={file.name}>
                    <FileCode2 />
                    <strong>{file.name}</strong>
                    <p>{file.text}</p>
                    <div>
                      <ChallengeCategoryBadge category={file.category} />
                      <span>{file.points} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </Feature>
      <Feature
        title="Give your community a date."
        description="Bring challenges together in an event. Set access rules and choose fixed or dynamic scoring."
        icon={<CalendarDays />}
        href="/preview?role=author"
        cta="Preview event tools"
      >
        <div className="calendar-preview">
          <div className="scene-caption">
            SEPTEMBER <span>Example event</span>
          </div>
          <div className="calendar-days">
            {"MTWTFSS".split("").map((day, i) => (
              <span key={i}>{day}</span>
            ))}
            {Array.from({ length: 35 }, (_, i) => (
              <b key={i} className={i >= 18 && i <= 20 ? "event-day" : ""}>
                {i < 1 || i > 30 ? "" : i}
              </b>
            ))}
          </div>
          <div className="calendar-event">
            <span /> Weekend CTF <small>18–20 SEP</small>
          </div>
        </div>
      </Feature>
      <Feature
        title="Every solve moves you forward."
        description="Follow the standings and revisit score histories. Practice progress stays separate from event results."
        icon={<Trophy />}
        href="/preview?role=player"
        cta="Preview player progress"
      >
        <div className="standings-preview">
          <div className="scene-caption">
            THE SCOREBOARD <span>Example data</span>
          </div>
          {[
            ["Nisha Rao", "1,950"],
            ["Arjun Mehta", "1,800"],
            ["Mira Shah", "1,650"],
          ].map(([name, points], i) => (
            <div
              className="standing-preview"
              key={name}
              style={{ animationDelay: `${i * 180}ms` }}
            >
              <span className="standing-rank">0{i + 1}</span>
              <UserAvatar id={`bento-${name}`} name={name!} size="sm" />
              <strong>{name}</strong>
              <span>
                {points}
                <small> pts</small>
              </span>
            </div>
          ))}
          <div className="solve-preview">
            ✓ Flag accepted <span>+150 points</span>
          </div>
        </div>
      </Feature>
      <Feature
        title="Your arena. All the keys."
        description="Host on your infrastructure. Manage roles, review challenges before publication, and keep an administrative audit trail."
        icon={<Server />}
        href="/preview?role=admin"
        cta="Explore the admin view"
        wide
      >
        <div className="scene-caption">
          SELF-HOSTED BY DESIGN <span>Your infrastructure</span>
        </div>
        <div className="hosting-preview">
          <svg
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <path d="M110 90 H300 M300 90 Q390 90 390 35 H490 M300 90 H490 M300 90 Q390 90 390 145 H490" />
          </svg>
          <div className="host-node host-core">
            <Server />
            <strong>FlagArena</strong>
            <small>Your instance</small>
          </div>
          <div className="host-services">
            <div>
              <Database /> PostgreSQL
            </div>
            <div>
              <FolderLock /> Local files
            </div>
            <div>
              <Users /> Players & authors
            </div>
          </div>
        </div>
      </Feature>
    </div>
  );
}
