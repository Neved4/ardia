export function engineMarkLayout(size: number) {
  const box = Math.round(size * 0.6);
  const offset = box / 3;
  return { box, offset };
}

export function containerDotLayout(size: number) {
  const { box, offset } = engineMarkLayout(size);
  const diameter = 11;
  const cutoutOffset = offset + (diameter - box) / 2;
  return { diameter, right: -cutoutOffset, bottom: -cutoutOffset };
}
