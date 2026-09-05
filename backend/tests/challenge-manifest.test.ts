import { describe, expect, it } from "vitest";
import { seededChallenges } from "../src/database/seeds/challenge-manifest.js";

describe("development challenge manifest", () => {
  it.each(seededChallenges)(
    "$title has a recoverable answer in its attachment",
    (challenge) => {
      let decoded = challenge.content;
      if (challenge.title === "Shift register") {
        decoded = decoded.replace(/[a-z]/gi, (char) => {
          const base = char <= "Z" ? 65 : 97;
          return String.fromCharCode(
            base + ((char.charCodeAt(0) - base + 13) % 26),
          );
        });
      } else if (
        ["Byte by byte", "Opcode alphabet"].includes(challenge.title)
      ) {
        decoded = Buffer.from(
          challenge.content.replace(/\s/g, ""),
          "hex",
        ).toString();
      } else if (challenge.title === "Vigenere postcard") {
        const key = challenge.content.match(/KEY=([A-Z]+)/)![1]!;
        const cipher = challenge.content.match(/CIPHERTEXT=(.+)/)![1]!;
        let index = 0;
        decoded = cipher.replace(/[A-Z]/g, (char) =>
          String.fromCharCode(
            97 +
              ((char.charCodeAt(0) -
                key.charCodeAt(index++ % key.length) +
                26) %
                26),
          ),
        );
      }
      expect(decoded).toContain(challenge.flag);
      expect(challenge.difficulty).toBe("easy");
      expect(challenge.file).not.toMatch(/[\\/]/);
    },
  );
  it("contains a balanced, complete catalog", () => {
    expect(seededChallenges).toHaveLength(40);
    expect(
      new Set(seededChallenges.map((challenge) => challenge.id)).size,
    ).toBe(40);
    expect(
      seededChallenges.filter(
        (challenge) => challenge.visibility === "public_practice",
      ),
    ).toHaveLength(20);
    expect(
      seededChallenges.filter(
        (challenge) => challenge.visibility === "event_only",
      ),
    ).toHaveLength(20);
    expect(
      new Set(seededChallenges.map((challenge) => challenge.category)),
    ).toEqual(
      new Set([
        "web",
        "crypto",
        "forensics",
        "reverse",
        "pwn",
        "osint",
        "misc",
      ]),
    );
    expect(
      seededChallenges.every((challenge) => challenge.content.length > 0),
    ).toBe(true);
    expect(
      seededChallenges.every((challenge) =>
        challenge.flag.startsWith("flagarena{"),
      ),
    ).toBe(true);
  });
});
