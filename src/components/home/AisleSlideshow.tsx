// One aisle of the market: a photo slideshow that cross-fades with a slow zoom ("Ken Burns").
// Runs only while visible on screen and the tab is in front; stays on the first photo when the
// visitor prefers reduced motion or has turned on data saver.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { photoUrl, type Photo } from "@/lib/photos";

type Props = {
  photos: Photo[];
  width: number;
  height: number;
  interval?: number;   // ms per photo
  offset?: number;     // ms before the first change, to keep tiles out of step
  paused?: boolean;    // e.g. while hovered
  onIndex?: (i: number) => void;
};

const saver = () => typeof document !== "undefined" && document.documentElement.hasAttribute("data-saver");

export default function AisleSlideshow({ photos, width, height, interval = 4500, offset = 0, paused, onIndex }: Props) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [visible, setVisible] = useState(false);
  const [front, setFront] = useState(() => typeof document === "undefined" || document.visibilityState === "visible");
  const box = useRef<HTMLDivElement>(null);
  const still = reduce || saver() || photos.length < 2;
  const running = !still && visible && front && !paused;

  useEffect(() => {
    const el = box.current;
    if (!el || typeof IntersectionObserver === "undefined") { setVisible(true); return; }
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onVis = () => setFront(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  useEffect(() => {
    if (!running) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => { setI((n) => (n + 1) % photos.length); timer = setTimeout(tick, interval); };
    timer = setTimeout(tick, i === 0 ? interval + offset : interval);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, interval, offset, photos.length]);

  useEffect(() => { onIndex?.(i); }, [i, onIndex]);

  // Warm the next photo so the cross-fade never shows an empty frame.
  useEffect(() => {
    if (still || !visible) return;
    const next = new Image();
    next.src = photoUrl(photos[(i + 1) % photos.length], width, height);
  }, [i, still, visible, photos, width, height]);

  const p = photos[i];
  const dir = i % 2 === 0 ? 1 : -1;
  return (
    <div ref={box} className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <AnimatePresence initial={false}>
        <motion.img
          key={p.id}
          src={photoUrl(p, width, height)}
          alt=""
          loading={i === 0 ? "lazy" : "eager"}
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover will-change-transform"
          initial={{ opacity: 0, scale: still ? 1 : 1.04, x: 0 }}
          animate={{ opacity: 1, scale: still ? 1 : 1.13, x: still ? 0 : dir * 10 }}
          exit={{ opacity: 0 }}
          transition={{ opacity: { duration: 1.1, ease: "easeInOut" }, scale: { duration: interval / 1000 + 1.5, ease: "linear" }, x: { duration: interval / 1000 + 1.5, ease: "linear" } }}
        />
      </AnimatePresence>
      {!still && (
        <div className="absolute top-0 inset-x-0 h-[3px] bg-white/15">
          <motion.div
            key={`bar-${i}-${running}`}
            className="h-full bg-primary"
            initial={{ width: "0%" }}
            animate={{ width: running ? "100%" : "0%" }}
            transition={{ duration: running ? (i === 0 ? interval + offset : interval) / 1000 : 0, ease: "linear" }}
          />
        </div>
      )}
    </div>
  );
}
