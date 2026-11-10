// Small inline SVG icons for the cream/plum UI (art/mockups/03-austin-stretch). They draw in
// `currentColor`, so CSS sets the ink. Nothing to download.

const svg = (body: string, vb = '0 0 24 24') =>
  `<svg class="ico" viewBox="${vb}" aria-hidden="true" fill="currentColor">${body}</svg>`;

export const ICON = {
  soundOn: svg('<path d="M4 9h3.5L12 5v14l-4.5-4H4z"/><path d="M15 9.2a4 4 0 0 1 0 5.6M17.6 6.6a7.6 7.6 0 0 1 0 10.8" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>'),
  soundOff: svg('<path d="M4 9h3.5L12 5v14l-4.5-4H4z"/><path d="M15.5 9.5l5 5m0-5l-5 5" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>'),
  horn: svg('<path d="M2.5 10.2c0-.9.7-1.6 1.6-1.6H6l9-4.6v15.9l-9-4.6H4.1c-.9 0-1.6-.7-1.6-1.6z"/><path d="M6.5 15.6l1.3 4.1h2.8l-1.2-3.6z"/><path d="M18 9.2a3.4 3.4 0 0 1 0 5.4M20.2 6.8a6.6 6.6 0 0 1 0 10.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'),
  garage: svg('<path d="M2 10.2L12 4l10 6.2V20h-3v-8.5H5V20H2z"/><path d="M6.5 13h11v1.8h-11zm0 3h11v1.8h-11zm0 3h11V20h-11z"/>'),
  driver: svg('<path d="M12 2.5c-4.2 0-7 3-7 7 0 1.4.3 2.6.9 3.6h12.2c.6-1 .9-2.2.9-3.6 0-4-2.8-7-7-7z"/><path d="M7 8.6h10c.8 0 1.3.6 1.1 1.4l-.3 1.2H6.2L5.9 10c-.2-.8.3-1.4 1.1-1.4z" fill="#f4e9d8" opacity=".9"/><path d="M3.5 21.5c.8-4 4.2-6.5 8.5-6.5s7.7 2.5 8.5 6.5z"/>'),
  play: svg('<path d="M7 4.5v15l12.5-7.5z"/>'),
  bolt: svg('<path d="M13.5 2L5 13.5h6L9.5 22 19 9.8h-6.2z"/>'),
  star: svg('<path d="M12 2.2l2.9 6.2 6.8.8-5 4.6 1.3 6.7L12 17.2l-6 3.3 1.3-6.7-5-4.6 6.8-.8z"/>'),
};
