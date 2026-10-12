/** Pin the listing over the story loading shell until the hero can snapshot. */

export function freezeOpenView() {
  if (typeof document === "undefined") return;
  if (document.querySelector("[data-story-open-freeze]")) return;
  const layer = document.createElement("div");
  layer.setAttribute("data-story-open-freeze", "");
  layer.setAttribute("aria-hidden", "true");
  layer.style.position = "fixed";
  layer.style.inset = "0";
  layer.style.zIndex = "90";
  layer.style.overflow = "hidden";
  layer.style.pointerEvents = "none";
  layer.style.background = "#ffffff";
  const frame = document.createElement("div");
  frame.style.position = "absolute";
  frame.style.left = "0";
  frame.style.top = `${-window.scrollY}px`;
  frame.style.width = "100%";
  for (const child of [...document.body.children]) {
    if (child.tagName === "SCRIPT") continue;
    if (child.getAttribute("data-story-open-freeze")) continue;
    if (child.getAttribute("data-story-back-morph")) continue;
    frame.appendChild(child.cloneNode(true));
  }
  layer.appendChild(frame);
  document.body.appendChild(layer);
}

export function thawOpenView() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-story-open-freeze]").forEach((node) => node.remove());
}
