import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ShareRemedy } from "@/components/share-remedy";
import { createRemedyCard } from "@/lib/remedy-card";
vi.mock("@/lib/remedy-card", () => ({ createRemedyCard: vi.fn() }));
const remedy = ["Enfrente a verdade com fé.", "Dê hoje o primeiro passo para mudar."];
beforeEach(() => {
  vi.mocked(createRemedyCard).mockResolvedValue(new File(["png"], "devocional-o-remedio.png", { type: "image/png" }));
  URL.createObjectURL = vi.fn(() => "blob:card"); URL.revokeObjectURL = vi.fn();
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function prepare() {
  render(<ShareRemedy remedy={remedy} />);
  fireEvent.click(screen.getByRole("button", { name: "Compartilhar o remédio" }));
  return screen.findByRole("button", { name: "Compartilhar imagem" });
}
describe("Remedy image sharing", () => {
  it("prepares the complete remedy and shares only the PNG, without a long text caption", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "share", { configurable: true, value: share });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    const button = await prepare();
    expect(createRemedyCard).toHaveBeenCalledWith(remedy);
    expect(share).not.toHaveBeenCalled();
    fireEvent.click(button);
    await waitFor(() => expect(share).toHaveBeenCalledOnce());
    expect(share.mock.calls[0]![0].files[0].type).toBe("image/png");
    expect(share.mock.calls[0]![0].text).toBeUndefined();
    expect(share.mock.calls[0]![0].url).toBeUndefined();
  });
  it("offers a download if file sharing is unsupported", async () => {
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => false });
    fireEvent.click(await prepare());
    expect(screen.getByText(/Baixe a imagem e envie/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Baixar imagem" })).toHaveAttribute("download", "devocional-o-remedio.png");
  });
  it("keeps a cancelled native share quiet", async () => {
    Object.defineProperty(navigator, "share", { configurable: true, value: vi.fn().mockRejectedValue(new DOMException("Cancelled", "AbortError")) });
    Object.defineProperty(navigator, "canShare", { configurable: true, value: () => true });
    const button = await prepare(); fireEvent.click(button);
    await waitFor(() => expect(button).not.toBeDisabled());
    expect(screen.queryByText(/Não foi possível compartilhar/)).not.toBeInTheDocument();
  });
});
