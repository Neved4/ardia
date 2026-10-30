export function closedGroupsLayout(ids: string[], frames: Record<string, { x: number; width: number }>, maxWidth: number, overflowWidth: number, gap: number) {
  const last = frames[ids.at(-1) ?? ""];
  const total = last ? last.x + last.width + gap : maxWidth;
  const width = Math.max(0, Math.min(total, maxWidth));
  const overflowing = total > maxWidth;
  const visible = ids.filter((id) => {
    const frame = frames[id];
    return !!frame && frame.x + frame.width <= width - (overflowing ? overflowWidth : 0);
  });
  return { width, overflowing, visible };
}
