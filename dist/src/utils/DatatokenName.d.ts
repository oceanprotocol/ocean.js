/**
 * Generate new datatoken name & symbol from a word list
 * @return {<{ name: String; symbol: String }>} datatoken name & symbol. Produces e.g. "Endemic Jellyfish Token" & "ENDJEL-45"
 */
export declare function generateDtName(wordList?: {
    nouns: string[];
    adjectives: string[];
}): {
    name: string;
    symbol: string;
};
