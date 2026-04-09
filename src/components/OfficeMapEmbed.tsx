import { OFFICE_MAP_EMBED_SRC } from "@/lib/constants";

type Props = {
  className?: string;
  /** Pixel height or CSS length, e.g. 220 or "min(55vw, 320px)" */
  height?: number | string;
  title?: string;
  /** `dark` for footer; `light` for marketing pages */
  surface?: "dark" | "light";
};

export function OfficeMapEmbed({
  className = "",
  height = 220,
  title = "Map — Scuba Diving with Island Trip, Baga, Goa",
  surface = "dark",
}: Props) {
  const styleHeight = typeof height === "number" ? `${height}px` : height;

  const shell =
    surface === "light"
      ? "border border-ocean-200 bg-white shadow-md"
      : "border border-slate-700 bg-slate-900 shadow-sm";

  return (
    <div
      className={`overflow-hidden rounded-2xl ${shell} ${className}`.trim()}
    >
      <iframe
        title={title}
        src={OFFICE_MAP_EMBED_SRC}
        width="100%"
        className="block w-full max-w-full"
        style={{ border: 0, height: styleHeight }}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    </div>
  );
}
