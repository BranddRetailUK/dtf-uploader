import Image from "next/image";

const DEFAULT_LOGO_URL =
  "https://res.cloudinary.com/dhlqooyuk/image/upload/v1778265668/NEW_LOGO_BLK_NO_STRAP_qthov8.png";

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
    <Image
      src={src}
      alt={LOGO_ALT_TEXT}
      width={width}
      height={height}
      priority={props.priority}
      className={props.className}
      style={{ height: "auto", width: `${width}px` }}
    />
  );
}
