const zipObject = (keys = [], values = []) => {
  return keys.reduce(
    (acc, key, index) => ({
      ...acc,
      [key]: values[index]
    }),
    {}
  )
}

export const objectPromiseAll = async (obj: { [key: string]: Promise<any> }) => {
  const keys = Object.keys(obj)
  const result = await Promise.all(Object.values(obj))
  return zipObject(keys, result)
}
