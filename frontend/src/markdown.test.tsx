import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "./components/Markdown";

describe("untrusted challenge content", () => {
  it("removes raw HTML, executable URLs, and remote images", () => {
    const html = renderToStaticMarkup(
      <Markdown>
        {
          "<script>alert(1)</script>\n\n[unsafe](javascript:alert%281%29)\n\n![tracker](https://example.test/track.png)"
        }
      </Markdown>,
    );
    expect(html).not.toContain("<script");
    expect(html).not.toContain("javascript:");
    expect(html).not.toContain("<img");
  });
  it("renders normal Markdown with safe new-tab links", () => {
    const html = renderToStaticMarkup(
      <Markdown>
        {"**Task**\n\n[Resource](https://example.test/resource)"}
      </Markdown>,
    );
    expect(html).toContain("<strong>Task</strong>");
    expect(html).toContain('rel="noopener noreferrer"');
  });
});
