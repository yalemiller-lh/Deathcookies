import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library cannot register this itself.
afterEach(cleanup);

// jsdom does not lay out pages, so it has no scrolling. (Worker tests run in
// plain Node, with no page at all.)
if (typeof window !== 'undefined') {
  Element.prototype.scrollIntoView ??= function scrollIntoView() {};
  window.scrollTo = () => {};
}
