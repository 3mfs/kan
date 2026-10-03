import Image from "next/image";

export default function WorkspaceIcon({
  name,
  imageUrl,
  size = "md",
}: {
  name: string;
  imageUrl?: string | null;
  size?: "sm" | "md" | "lg";
}) {
  const dimension = size === "sm" ? 20 : size === "lg" ? 64 : 24;
  const sizeClass =
    size === "sm" ? "h-5 w-5" : size === "lg" ? "h-16 w-16" : "h-6 w-6";

  if (imageUrl) {
    return (
      <Image
        src={imageUrl}
        alt=""
        width={dimension}
        height={dimension}
        className={`${sizeClass} flex-shrink-0 rounded-md object-cover`}
      />
    );
  }

  return (
    <span
      className={`inline-flex ${sizeClass} flex-shrink-0 items-center justify-center rounded-md bg-indigo-700`}
    >
      <span
        className={`font-bold leading-none text-white ${size === "lg" ? "text-xl" : "text-xs"}`}
      >
        {name.charAt(0).toUpperCase()}
      </span>
    </span>
  );
}
