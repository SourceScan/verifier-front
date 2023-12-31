function ascii_to_str(input: any) {
  const ascii_arr = input as Uint8Array
  let data_str = ''
  for (let i = 0; i < ascii_arr.length; i++) {
    data_str += String.fromCharCode(ascii_arr[i])
  }

  return data_str
}

export { ascii_to_str }
