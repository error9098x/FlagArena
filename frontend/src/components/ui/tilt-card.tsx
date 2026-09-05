// Adapted from beUI Tilt Card (MIT): https://beui.dev/components/motion/tilt-card
import { useRef, type ReactNode } from "react";
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from "motion/react";

export function TiltCard({ children }: { children: ReactNode }) {
  const area = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const rx = useSpring(0, { stiffness: 240, damping: 28 });
  const ry = useSpring(0, { stiffness: 240, damping: 28 });
  const gx = useMotionValue(50);
  const gy = useMotionValue(50);
  const transform = useMotionTemplate`perspective(1200px) rotateX(${rx}deg) rotateY(${ry}deg)`;
  const background = useMotionTemplate`radial-gradient(circle at ${gx}% ${gy}%, #d6ffef20, transparent 65%)`;
  return (
    <div
      ref={area}
      className="preview-tilt-area"
      onPointerMove={(event) => {
        if (
          reduce ||
          event.pointerType !== "mouse" ||
          !matchMedia("(hover: hover)").matches
        )
          return;
        const rect = area.current!.getBoundingClientRect();
        const x = Math.max(
          0,
          Math.min(1, (event.clientX - rect.left) / rect.width),
        );
        const y = Math.max(
          0,
          Math.min(1, (event.clientY - rect.top) / rect.height),
        );
        rx.set((0.5 - y) * 8);
        ry.set((x - 0.5) * 8);
        gx.set(x * 100);
        gy.set(y * 100);
      }}
      onPointerLeave={() => {
        rx.set(0);
        ry.set(0);
      }}
    >
      <motion.div
        className="preview-tilt"
        style={{ transform: reduce ? "none" : transform }}
      >
        {children}
        {!reduce && (
          <motion.div
            aria-hidden="true"
            className="preview-glare"
            style={{ background }}
          />
        )}
      </motion.div>
    </div>
  );
}
