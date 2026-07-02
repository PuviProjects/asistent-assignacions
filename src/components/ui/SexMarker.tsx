import { cn } from "@/lib/utils";
import { SEX_LABEL, type Sex } from "@/types";

export function SexMarker({ sex, className }: { sex: Sex; className?: string }) {
  return (
    <span
      title={SEX_LABEL[sex]}
      className={cn(
        "text-[11px] font-semibold",
        sex === "H" ? "text-sex-h" : "text-sex-d",
        className,
      )}
    >
      {sex}
    </span>
  );
}
