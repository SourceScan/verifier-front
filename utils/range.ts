const range = (
  start: number,
  stop: number,
  step: number = 1
): Array<number> => {
  return Array.from(
    { length: (stop - start) / step + 1 },
    (value, index) => start + index * step
  )
}
export { range }
