// Drop-in <img> replacement for demo placeholder images.
//
// Behaves exactly like <img> but adds an offline fallback: when the picsum.photos
// photo from `placeholderImage()` fails to load, it swaps to a deterministic
// local SVG (see onPlaceholderImgError). Any explicit onError prop is preserved.
import type { ComponentProps } from "react";
import { onPlaceholderImgError } from "@/lib/imageFallback";

export function DemoImg(props: ComponentProps<"img">) {
  return <img {...props} onError={props.onError ?? onPlaceholderImgError} />;
}
