/** Safari drops cross-origin photos from view-transition snapshots, leaving card fills black. */

function drawCover(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  cw: number,
  ch: number,
) {
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(cw / iw, ch / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}

function rasterizeOne(img: HTMLImageElement) {
  if (!img.complete || img.naturalWidth === 0) return () => undefined;
  if (img.closest("[data-story-open-freeze]")) return () => undefined;
  if (img.parentElement?.querySelector("[data-story-open-raster]")) return () => undefined;
  const parent = img.parentElement;
  if (!parent) return () => undefined;
  const width = img.clientWidth || img.getBoundingClientRect().width;
  const height = img.clientHeight || img.getBoundingClientRect().height;
  if (width < 2 || height < 2) return () => undefined;
  const canvas = document.createElement("canvas");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.max(1, Math.round(width * dpr));
  canvas.height = Math.max(1, Math.round(height * dpr));
  canvas.setAttribute("data-story-open-raster", "");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.position = "absolute";
  canvas.style.inset = "0";
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.pointerEvents = "none";
  canvas.style.viewTransitionName = "none";
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => undefined;
  try {
    drawCover(ctx, img, canvas.width, canvas.height);
  } catch {
    return () => undefined;
  }
  const previous = img.style.visibility;
  img.style.visibility = "hidden";
  parent.appendChild(canvas);
  return () => {
    img.style.visibility = previous;
    canvas.remove();
  };
}

export function rasterizeOpenImages() {
  if (typeof document === "undefined") return () => undefined;
  const restorers = [...document.querySelectorAll("img")].map((node) =>
    node instanceof HTMLImageElement ? rasterizeOne(node) : () => undefined,
  );
  void document.body.offsetHeight;
  return () => {
    restorers.forEach((restore) => restore());
  };
}

export function joinRestores(first: () => void, next: () => void) {
  return () => {
    first();
    next();
  };
}
