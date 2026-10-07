import { dayOfYear } from './dates';

export interface Quote {
  text: string;
  by: string;
}

export const QUOTES: readonly Quote[] = [
  { text: 'Begin at once to live, and count each separate day as a separate life.', by: 'Seneca' },
  { text: 'Waste no more time arguing about what a good man should be. Be one.', by: 'Marcus Aurelius' },
  { text: 'First say to yourself what you would be; and then do what you have to do.', by: 'Epictetus' },
  { text: 'Do not wait to strike till the iron is hot; but make it hot by striking.', by: 'W. B. Yeats' },
  { text: 'He who has a why to live can bear almost any how.', by: 'Friedrich Nietzsche' },
  { text: 'Little by little, one travels far.', by: 'Proverb' },
  { text: 'No one ever steps in the same river twice.', by: 'Heraclitus' },
  { text: 'Well begun is half done.', by: 'Aristotle' },
];

/** One quote per calendar day, cycling through the list. */
export function quoteFor(today: Date): Quote {
  return QUOTES[dayOfYear(today) % QUOTES.length]!;
}
