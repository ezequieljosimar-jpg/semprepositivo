import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShareRemedy } from "@/components/share-remedy";

const props = { remedy: ["Enfrente a verdade com fé.", "Dê hoje o primeiro passo para mudar."] };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("Remedy sharing", () => {
  it("shares the complete remedy with a public link, without the protected day URL", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    render(<ShareRemedy {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar o remédio" }));
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    const data = share.mock.calls[0]![0];
    expect(data.text).toContain(props.remedy[0]);
    expect(data.text).toContain(props.remedy[1]);
    expect(data.text).toContain("https://semprepositivo.lovable.app");
    expect(data.text).not.toContain("/dia/");
  });

  it("treats native cancellation quietly", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")) });
    render(<ShareRemedy {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar o remédio" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Compartilhar o remédio" })).not.toBeDisabled());
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
    expect(screen.queryByText("Compartilhar pelo WhatsApp")).not.toBeInTheDocument();
  });

  it("offers copy and WhatsApp without native sharing, and manual copy on clipboard failure", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: undefined });
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<ShareRemedy {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Compartilhar o remédio" }));
    const link = screen.getByRole("link", { name: "Compartilhar pelo WhatsApp" });
    expect(decodeURIComponent(link.getAttribute("href")!)).toContain(props.remedy[1]);
    fireEvent.click(screen.getByRole("button", { name: "Copiar o remédio" }));
    expect((await screen.findByRole("textbox", { name: "Remédio para copiar" }) as HTMLTextAreaElement).value).toContain(props.remedy[0]!);
  });
});
