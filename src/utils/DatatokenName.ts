import wordListDefault from './data/words.json'

/**
 * This function generates a datatoken name and symbol from a given word list.
 * @param {Object} [wordList] - An object containing an array of nouns and adjectives.
 * @param {string[]} [wordList.nouns] - An array of nouns.
 * @param {string[]} [wordList.adjectives] - An array of adjectives.
 * @returns {Object} Returns an object containing the generated name and symbol. Produces e.g. "Endemic Jellyfish Token" & "ENDJEL-45"
 */
export function generateDtName(wordList?: { nouns: string[]; adjectives: string[] }): {
  name: string
  symbol: string
} {
  const list = wordList || wordListDefault
  const random1 = Math.floor(Math.random() * list.adjectives.length)
  const random2 = Math.floor(Math.random() * list.nouns.length)
  const indexNumber = Math.floor(Math.random() * 100)

  // Capitalized adjective & noun
  const adjective = list.adjectives[random1].replace(/^\w/, (c) => c.toUpperCase())
  const noun = list.nouns[random2].replace(/^\w/, (c) => c.toUpperCase())

  const name = `${adjective} ${noun} Token`
  // use first 3 letters of name, uppercase it, and add random number
  const symbol = `${(
    adjective.substring(0, 3) + noun.substring(0, 3)
  ).toUpperCase()}-${indexNumber}`

  return { name, symbol }
}
