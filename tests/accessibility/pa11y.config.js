module.exports = {
  standard: 'WCAG2AA',
  runners: [
    'axe',
    'htmlcs'
  ],
  ignore: [
    'WCAG2AA.Principle1.Guideline1_4.1_4_3.G18.Fail' // Ignore specific color contrast issues handled in theme
  ],
  hideElements: [
    '.animation', // Ignore animated elements
    '[aria-hidden="true"]' // Ignore hidden elements
  ],
  viewport: {
    width: 1280,
    height: 720
  },
  actions: [
    // Test user interactions
    'click element #connect-wallet-btn',
    'wait for element [data-testid=user-address]',
    'click element [data-testid=nav-marketplace]',
    'wait for element [data-testid=marketplace-page]',
    // Add more actions as needed
  ],
  // Custom rules
  rules: [
    {
      name: 'Heading hierarchy',
      message: 'Headings must be in order (h1, h2, etc.)',
      selector: 'h1, h2, h3, h4, h5, h6',
      test: (element) => {
        const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
        const levels = Array.from(headings).map(h => parseInt(h.tagName[1]));
        return levels[0] === 1 && levels.every((level, i) => 
          i === 0 || level <= levels[i-1] + 1
        );
      }
    },
    {
      name: 'Focus visible',
      message: 'All interactive elements must have a visible focus state',
      selector: 'button, a, input, select, textarea, [tabindex]',
      test: (element) => {
        const style = window.getComputedStyle(element);
        return style.outlineStyle !== 'none' || style.boxShadow !== 'none';
      }
    }
  ]
};
