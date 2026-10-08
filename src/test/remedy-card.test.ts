import { describe, expect, it } from "vitest";
import { wrapCardText } from "@/lib/remedy-card";
const context = { measureText: (text: string) => ({ width: text.length * 10 } as TextMetrics) };
describe("Remedy card layout", () => {
  it("wraps a long remedy without dropping any words or punctuation", () => {
    const text = '“O que estou usando como desculpa para não começar?”';
    const lines = wrapCardText(context, text, 200);
    expect(lines.join(" ")).toBe(text);
    expect(lines.every(line => context.measureText(line).width <= 200)).toBe(true);
  });
  it("retains accents and handles an empty paragraph", () => {
    expect(wrapCardText(context, "Fé, decisão e cura.", 1000)).toEqual(["Fé, decisão e cura."]);
    expect(wrapCardText(context, "", 200)).toEqual([]);
  });
});
