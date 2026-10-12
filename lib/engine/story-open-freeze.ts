/** Pin the listing over the story loading shell until the hero can snapshot. */

function stripTransitionNames(root: Node) {
  if (!(root instanceof HTMLElement)) return;
  const clear = (node: HTMLElement) => {
    node.style.viewTransitionName = "none";
    const style = node.style as CSSStyleDeclaration & { viewTransitionClass?: string };
    if ("viewTransitionClass" in style) style.viewTransitionClass = "";
  };
  clear(root);
  root.querySelectorAll("*").forEach((node) => {
    if (node instanceof HTMLElement) clear(node);
  });
}

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
  layer.style.viewTransitionName = "none";
  const frame = document.createElement("div");
  frame.style.position = "absolute";
  frame.style.left = "0";
  frame.style.top = `${-window.scrollY}px`;
  frame.style.width = "100%";
  for (const child of [...document.body.children]) {
    if (child.tagName === "SCRIPT") continue;
    if (child.getAttribute("data-story-open-freeze")) continue;
    if (child.getAttribute("data-story-back-morph")) continue;
    const clone = child.cloneNode(true);
    stripTransitionNames(clone);
    frame.appendChild(clone);
  }
  layer.appendChild(frame);
  document.body.appendChild(layer);
}

export function thawOpenView() {
  if (typeof document === "undefined") return;
  document.querySelectorAll("[data-story-open-freeze]").forEach((node) => node.remove());
}
