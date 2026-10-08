import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareVerse } from "@/components/share-verse";

const props = { verse: ["O Senhor é o meu pastor."], reference: "Salmos 23:1" };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Verse sharing", () => {
  it("shares the verse with a public link, without the protected day URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<ShareVerse {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar versículo" }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    const data = share.mock.calls[0]![0];
    expect(data.text).toContain(props.verse[0]);
    expect(data.text).toContain(props.reference);
    expect(data.text).toContain("https://semprepositivo.lovable.app");
    expect(data.text).not.toContain("/dia/");
  });

  it("treats native cancellation quietly", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")) });
    render(<ShareVerse {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar versículo" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartilhar versículo" })).not.toBeDisabled());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByText("Compartilhar pelo WhatsApp")).not.toBeInTheDocument();
  });

  it("offers copy and WhatsApp without native sharing, and manual copy on clipboard failure", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ShareVerse {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar versículo" }));
    const link = screen.getByRole("link", { name: "Compartilhar pelo WhatsApp" });
    expect(decodeURIComponent(link.getAttribute("href")!)).toContain(props.reference);
    fireEvent.click(screen.getByRole("button", { name: "Copiar versículo" }));
    expect((await screen.findByRole("textbox", { name: "Versículo para copiar" }) as HTMLTextAreaElement).value).toContain(props.verse[0]!);
  });
});
