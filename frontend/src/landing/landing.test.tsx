import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ProductPreview } from "./ProductPreview";
import { CipherBackground } from "./CipherBackground";
import { CipherWordmark } from "./CipherWordmark";
import { PreviewPage } from "./PreviewPage";
import { exampleDashboard } from "./example-dashboard";
import { DemoAnalytics } from "./DemoInsights";
import { seedDemo } from "./demo-state";

describe("Public product preview", () => {
  it("shows useful author performance metrics without native meter bars", () => {
    const html = renderToStaticMarkup(
      <DemoAnalytics state={seedDemo("author")} go={() => {}} />,
    );
    expect(html).toContain("Challenge performance");
    expect(html).toContain("Median time");
    expect(html).toContain("Hint use");
    expect(html).toContain("Low completion");
    expect(html).not.toContain("<meter");
    expect(html).not.toContain("Solves by challenge");
    expect(html).not.toContain("Broken signature");
  });
  it("identifies sample content and provides accessible tabs", () => {
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <ProductPreview />
      </MemoryRouter>,
    );
    expect(html).toContain("Example data");
    expect(html.match(/role="tab"/g)).toHaveLength(3);
    expect(html).toContain('aria-selected="true"');
    expect(html).toContain("Shift register");
    expect(html).toContain('data-slot="avatar"');
    expect(html).not.toContain(">AM<");
    expect(html).not.toContain("flagarena{rotation}");
  });
  it("keeps decorative ciphertext out of the accessibility tree", () => {
    expect(renderToStaticMarkup(<CipherBackground />)).toContain(
      'aria-hidden="true"',
    );
  });
  it("clips the footer ciphertext to the lower part of the wordmark", () => {
    const html = renderToStaticMarkup(<CipherWordmark />);
    expect(html).not.toContain("foreignObject");
    expect(html).toContain('class="wordmark-cipher"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('class="footer-wordmark"');
  });
  it.each(["player", "author", "admin"] as const)(
    "renders the %s demo without links into live authenticated routes",
    (role) => {
      const html = renderToStaticMarkup(
        <MemoryRouter initialEntries={[`/preview?role=${role}`]}>
          <PreviewPage />
        </MemoryRouter>,
      );
      expect(html).toContain("Interactive demo");
      expect(html).toContain("Workspace navigation");
      expect(html).not.toMatch(
        /href="\/(manage|admin|events|challenges|activity)/,
      );
      expect(html).not.toContain("Create account");
      expect(html).not.toMatch(
        /Try the challenge cycle|browser-local|No live accounts|Read-only preview/,
      );
      expect(html).toContain('role="combobox"');
    },
  );
  it("keeps the example review count consistent with its queue", () => {
    const data = exampleDashboard("admin");
    expect(data.challenges).toHaveLength(
      data.stats.find((stat) => stat.label === "Pending reviews")!.value,
    );
    expect(
      data.challenges.every((challenge) => challenge.status === "pending"),
    ).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(
      /password|accessToken|refreshToken/,
    );
  });
});
