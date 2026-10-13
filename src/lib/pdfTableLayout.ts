export function fitFixedColumnWidths(
  widths: number[],
  availableWidth: number,
  reservedWidth: number,
): number[] {
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);
  const widthBudget = Math.max(0, availableWidth - reservedWidth);
  const scale = totalWidth > widthBudget && totalWidth > 0
    ? widthBudget / totalWidth
    : 1;

  return widths.map((width) => width * scale);
}
