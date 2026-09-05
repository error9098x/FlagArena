import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Switch } from "./switch";

describe("Switch", () => {
  it.each([true, false])(
    "exposes checked=%s and preserves named form input",
    (checked) => {
      const html = renderToStaticMarkup(
        <form>
          <Switch
            name="isSuspended"
            aria-label="Suspend account"
            defaultChecked={checked}
          />
        </form>,
      );
      expect(html).toContain('role="switch"');
      expect(html).toContain(`aria-checked="${checked}"`);
      expect(html).toContain('name="isSuspended"');
      expect(html).toContain('value="on"');
      expect(html).toContain('type="button"');
    },
  );
  it("supports disabled controls", () => {
    expect(
      renderToStaticMarkup(<Switch disabled aria-label="Setting" />),
    ).toContain('disabled=""');
  });
});
