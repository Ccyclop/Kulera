import Image from "next/image";
import { cn } from "@/lib/cn";

type BrandLogoVariant = "primary" | "lockup" | "icon" | "monochrome";

const brandAssets: Record<BrandLogoVariant, { src: string; width: number; height: number; alt: string }> = {
  primary: {
    src: "/brand/kulera-primary.png",
    width: 1061,
    height: 404,
    alt: "Kulera",
  },
  lockup: {
    src: "/brand/kulera-lockup.png",
    width: 1027,
    height: 480,
    alt: "Kulera Everyday Recipes",
  },
  icon: {
    src: "/brand/kulera-app-icon.png",
    width: 717,
    height: 708,
    alt: "Kulera",
  },
  monochrome: {
    src: "/brand/kulera-monochrome.png",
    width: 1032,
    height: 389,
    alt: "Kulera",
  },
};

export function BrandLogo({
  variant = "primary",
  className,
  imageClassName,
  priority = false,
  decorative = false,
}: {
  variant?: BrandLogoVariant;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
  decorative?: boolean;
}) {
  const asset = brandAssets[variant];

  return (
    <span aria-hidden={decorative || undefined} className={cn("inline-block shrink-0", className)}>
      <Image
        src={asset.src}
        alt={decorative ? "" : asset.alt}
        width={asset.width}
        height={asset.height}
        priority={priority}
        className={cn("h-full w-full object-contain", imageClassName)}
      />
    </span>
  );
}
