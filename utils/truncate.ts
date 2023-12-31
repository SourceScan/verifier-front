function truncateStringInMiddle(str: string, maxLength: number) {
  if (str.length <= maxLength) {
    return str
  }

  const halfMaxLength = Math.floor(maxLength / 2)
  const firstHalf = str.slice(0, halfMaxLength)
  const secondHalf = str.slice(-halfMaxLength)

  return firstHalf + '...' + secondHalf
}

export { truncateStringInMiddle }
