import { type RefObject, useEffect, useRef } from "react";

const alphabet = "0123456789ABCDEF{}[]<>/+=#";

export function CipherBackground({
  vivid = false,
  fadeAfter,
}: {
  vivid?: boolean;
  fadeAfter?: RefObject<HTMLElement | null>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    const area = canvas?.parentElement;
    const context = canvas?.getContext("2d");
    if (!canvas || !area || !context) return;
    const style = getComputedStyle(canvas);
    const mint = style.getPropertyValue("--primary").trim();
    const violet = style.getPropertyValue("--chart-4").trim();
    const muted = style.getPropertyValue("--muted-foreground").trim();
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const pointer = { x: -1000, y: -1000 };
    let cells: { x: number; y: number; character: string }[] = [];
    let width = 0,
      height = 0,
      visible = true;
    let timer: ReturnType<typeof setInterval> | undefined;
    let frame = 0;
    const letterMask = document.createElement("canvas");
    const maskContext = letterMask.getContext("2d")!;
    const solid = style.getPropertyValue("--muted").trim();
    function wordmark(target: CanvasRenderingContext2D) {
      target.save();
      target.font = `600 ${(width / 1000) * 210}px ${style.fontFamily}`;
      target.scale(width / target.measureText("FlagArena").width, 1);
      target.fillText("FlagArena", 0, height * (172 / 220));
      target.restore();
    }
    const character = () =>
      alphabet[Math.floor(Math.random() * alphabet.length)]!;
    function draw(change = false) {
      context!.clearRect(0, 0, width, height);
      context!.font = "11px ui-monospace, monospace";
      const footerBoundary = fadeAfter?.current?.getBoundingClientRect().bottom;
      for (const cell of cells) {
        if (change && Math.random() < 0.035) cell.character = character();
        const distance = Math.hypot(cell.x - pointer.x, cell.y - pointer.y);
        const glow = !motion.matches ? Math.max(0, 1 - distance / 170) : 0;
        const footerFade =
          footerBoundary === undefined
            ? 1
            : Math.max(0, Math.min(1, (footerBoundary - cell.y) / 120));
        context!.globalAlpha =
          (vivid ? 0.48 + glow * 0.52 : 0.075 + glow * 0.5) * footerFade;
        context!.fillStyle = vivid
          ? (Math.floor(cell.x / 11) + Math.floor(cell.y / 14)) % 3 === 0
            ? violet
            : mint
          : glow
            ? cell.x < pointer.x
              ? mint
              : violet
            : muted;
        context!.fillText(cell.character, cell.x, cell.y);
      }
      context!.globalAlpha = 1;
      if (footerBoundary !== undefined) {
        // Clear glyph descenders too, so no pixels extend past the divider.
        const cutoff = Math.max(0, footerBoundary);
        context!.clearRect(0, cutoff, width, Math.max(0, height - cutoff));
      }
      if (vivid && width > 0) {
        // Canvas compositing avoids Safari's SVG foreignObject mask leakage.
        context!.globalCompositeOperation = "destination-in";
        context!.drawImage(letterMask, 0, 0, width, height);
        context!.globalCompositeOperation = "destination-over";
        const fade = context!.createLinearGradient(0, 0, 0, height);
        fade.addColorStop(0, solid);
        fade.addColorStop(0.45, solid);
        fade.addColorStop(0.75, "transparent");
        context!.fillStyle = fade;
        wordmark(context!);
        context!.globalCompositeOperation = "source-over";
      }
    }
    function resize() {
      const rect = canvas!.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      const scale = Math.min(devicePixelRatio || 1, 2);
      canvas!.width = Math.round(width * scale);
      canvas!.height = Math.round(height * scale);
      context!.setTransform(scale, 0, 0, scale, 0, 0);
      if (vivid && width > 0) {
        letterMask.width = canvas!.width;
        letterMask.height = canvas!.height;
        maskContext.setTransform(scale, 0, 0, scale, 0, 0);
        const fade = maskContext.createLinearGradient(0, 0, 0, height);
        fade.addColorStop(0, "transparent");
        fade.addColorStop(0.45, "transparent");
        fade.addColorStop(0.75, "white");
        maskContext.fillStyle = fade;
        wordmark(maskContext);
      }
      cells = [];
      for (let y = vivid ? 11 : 16; y < height; y += vivid ? 14 : 32)
        for (let x = vivid ? 0 : 12; x < width; x += vivid ? 11 : 30)
          cells.push({ x, y, character: character() });
      draw();
    }
    function schedule() {
      clearInterval(timer);
      if (!motion.matches && visible && !document.hidden)
        timer = setInterval(() => {
          draw(true);
        }, 20);
      draw();
    }
    function move(event: PointerEvent) {
      if (motion.matches || event.pointerType !== "mouse") return;
      const rect = canvas!.getBoundingClientRect();
      pointer.x = event.clientX - rect.left;
      pointer.y = event.clientY - rect.top;
      if (frame) return;
      frame = requestAnimationFrame(() => {
        draw(true);
        frame = 0;
      });
    }
    function leave() {
      cancelAnimationFrame(frame);
      frame = 0;
      pointer.x = -1000;
      pointer.y = -1000;
      draw();
    }
    function handleScroll() {
      draw();
    }
    const resizeObserver = new ResizeObserver(resize);
    const intersection = new IntersectionObserver(([entry]) => {
      visible = !!entry?.isIntersecting;
      schedule();
    });
    resizeObserver.observe(canvas);
    intersection.observe(canvas);
    area.addEventListener("pointermove", move);
    area.addEventListener("pointerleave", leave);
    motion.addEventListener("change", schedule);
    document.addEventListener("visibilitychange", schedule);
    window.addEventListener("scroll", handleScroll, { passive: true });
    resize();
    schedule();
    return () => {
      clearInterval(timer);
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      intersection.disconnect();
      area.removeEventListener("pointermove", move);
      area.removeEventListener("pointerleave", leave);
      motion.removeEventListener("change", schedule);
      document.removeEventListener("visibilitychange", schedule);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [fadeAfter, vivid]);
  return (
    <canvas
      ref={ref}
      className={vivid ? "wordmark-cipher" : "cipher-background"}
      aria-hidden="true"
    />
  );
}
