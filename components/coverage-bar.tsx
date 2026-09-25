import { STATUS_PALETTES } from "@/lib/constants";

export function CoverageBar({
  covered,
  total,
  height = 8,
}: {
  covered: number;
  total: number;
  height?: number;
}) {
  const pctCovered = total ? (covered / total) * 100 : 0;
  return (
    <div
      className="w-full overflow-hidden rounded-full bg-muted"
      style={{ height }}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pctCovered}%`,
          backgroundColor: STATUS_PALETTES.success.fg,
        }}
      />
    </div>
  );
}
