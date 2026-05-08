import Image from "next/image";

const DEFAULT_LOGO_URL =
  "https://res.cloudinary.com/dhlqooyuk/image/upload/v1778265380/NEW_LOGO_WHT_NO_STRAP_heexb3.png";

const LOGO_ASPECT_RATIO = 205 / 886;
const LOGO_ALT_TEXT = "Brandd";

export function LamiLogo(props: {
  src?: string;
  width?: number;
  priority?: boolean;
  className?: string;
}) {
  const width = props.width ?? 160;
  const height = Math.round(width * LOGO_ASPECT_RATIO);
  const src = props.src ?? DEFAULT_LOGO_URL;

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-[#7e00ff] px-3 py-2 shadow-[0_12px_28px_rgba(126,0,255,0.14)] ${
        props.className ?? ""
      }`}
    >
      <Image
        src={src}
        alt={LOGO_ALT_TEXT}
        width={width}
        height={height}
        priority={props.priority}
        style={{ height: "auto", width: `${width}px` }}
      />
    </span>
  );
}
