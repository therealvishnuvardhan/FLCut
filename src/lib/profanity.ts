import {
  RegExpMatcher,
  englishDataset,
  englishRecommendedTransformers,
} from "obscenity";

const matcher = new RegExpMatcher({
  ...englishDataset.build(),
  ...englishRecommendedTransformers,
});

/**
 * Checks if the given text contains profanity.
 * @param text The input string to check.
 * @returns true if profanity is found, false otherwise.
 */
export function hasProfanity(text: string): boolean {
  return matcher.hasMatch(text);
}
