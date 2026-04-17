import Image from "next/image";

const DEFAULT_LOGO_URL =
  "https://res.cloudinary.com/dhlqooyuk/image/upload/v1776406928/lami_logo_af9hhs.png";

export function LamiLogo(props: {
  src?: string;
  width?: number;
  priority?: boolean;
  className?: string;
}) {
  const width = props.width ?? 160;
  const height = Math.round(width * 0.36);
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
