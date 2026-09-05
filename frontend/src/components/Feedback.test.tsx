import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Loading } from "./Feedback";

describe("Loading feedback", () => {
  it("announces loading without rendering visual placeholders", () => {
    expect(renderToStaticMarkup(<Loading />)).toBe(
      '<span role="status" class="sr-only">Loading</span>',
    );
  });
});
