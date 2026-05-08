import Image from "next/image";

const DEFAULT_LOGO_URL =
  "https://res.cloudinary.com/dhlqooyuk/image/upload/v1778178820/LOGO_STRAP_dark_j4tyyu.png";

const LOGO_ASPECT_RATIO = 284 / 1000;

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
      alt="Lami"
      width={width}
      height={height}
      priority={props.priority}
      className={props.className}
      style={{ height: "auto", width: `${width}px` }}
    />
  );
}
