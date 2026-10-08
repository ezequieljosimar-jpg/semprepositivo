import cover from "@/assets/cover-cross-light.webp";

// Draw only the remedy already returned by the authorized day loader.
export function wrapCardText(context: Pick<CanvasRenderingContext2D, "measureText">, text: string, width: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > width) { lines.push(line); line = word; }
    else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export async function createRemedyCard(remedy: string[]): Promise<File> {
  await document.fonts?.ready;
  const photo = new Image();
  photo.src = cover;
  await new Promise<void>((resolve, reject) => {
    photo.onload = () => resolve();
    photo.onerror = () => reject(new Error("Background unavailable"));
  });
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Image unavailable");
  let size = 52;
  const layout = () => {
    ctx.font = `${size}px Georgia, serif`;
    return remedy.map(paragraph => wrapCardText(ctx, paragraph, 856));
  };
  let paragraphs = layout();
  const height = () => paragraphs.reduce((sum, lines) => sum + lines.length * size * 1.4 + 28, 0);
  while (height() > 830 && size > 34) { size -= 2; paragraphs = layout(); }
  // Long remedies expand the card rather than being cut off.
  canvas.height = Math.max(1350, Math.ceil(height() + 500));
  const gradient = ctx.createLinearGradient(0, 0, 1080, canvas.height);
  gradient.addColorStop(0, "#24211e"); gradient.addColorStop(1, "#0f0e0d");
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const scale = Math.max(canvas.width / photo.naturalWidth, canvas.height / photo.naturalHeight);
  const photoWidth = photo.naturalWidth * scale;
  ctx.drawImage(photo, (canvas.width - photoWidth) * 0.72, 0, photoWidth, photo.naturalHeight * scale);
  const shade = ctx.createLinearGradient(0, 0, 0, canvas.height);
  shade.addColorStop(0, "rgba(13,12,11,0.75)");
  shade.addColorStop(0.45, "rgba(13,12,11,0.86)");
  shade.addColorStop(1, "rgba(13,12,11,0.94)");
  ctx.fillStyle = shade; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = "#625046"; ctx.lineWidth = 1; ctx.strokeRect(40, 40, 1000, canvas.height - 80);
  ctx.fillStyle = "#dc8268"; ctx.fillRect(112, 105, 66, 4);
  ctx.font = "600 24px Arial, sans-serif"; ctx.fillText("DEVOCIONAL SEMPRE POSITIVO", 112, 164);
  ctx.font = "italic 42px Georgia, serif"; ctx.fillStyle = "#dc8268"; ctx.fillText("O remédio", 112, 248);
  ctx.fillStyle = "#f2eadf"; ctx.font = `${size}px Georgia, serif`;
  let y = 350;
  for (const lines of paragraphs) {
    for (const line of lines) { ctx.fillText(line, 112, y); y += size * 1.4; }
    y += 28;
  }
  const footer = canvas.height - 190;
  ctx.fillStyle = "#dc8268"; ctx.fillRect(112, footer - 40, 66, 3);
  ctx.fillStyle = "#f2eadf"; ctx.font = "600 30px Arial, sans-serif"; ctx.fillText("É AMARGO, MAS CURA.", 112, footer + 8);
  ctx.fillStyle = "#bdb2a7"; ctx.font = "24px Arial, sans-serif"; ctx.fillText("semprepositivo.lovable.app", 112, footer + 58);
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error("Image unavailable")), "image/png"));
  return new File([blob], "devocional-o-remedio.png", { type: "image/png" });
}
