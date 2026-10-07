import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Vitest runs without globals, so Testing Library cannot register this itself.
afterEach(cleanup);

// jsdom does not lay out pages, so it has no scrolling.
Element.prototype.scrollIntoView ??= function scrollIntoView() {};
window.scrollTo = () => {};
