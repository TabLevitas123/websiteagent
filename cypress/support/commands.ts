// ***********************************************
// Custom commands for Website Agent E2E Tests
// ***********************************************

declare global {
  namespace Cypress {
    interface Chainable {
      /**
       * Custom command to connect wallet
       * @example cy.connectWallet()
       */
      connectWallet(): Chainable<Element>
      
      /**
       * Custom command to purchase an agent
       * @example cy.purchaseAgent('Test Agent')
       */
      purchaseAgent(agentName: string): Chainable<Element>
      
      /**
       * Custom command to verify metrics data
       * @example cy.verifyMetrics()
       */
      verifyMetrics(): Chainable<Element>
    }
  }
}

Cypress.Commands.add('connectWallet', () => {
  cy.window().then((win) => {
    win.ethereum = {
      request: () => Promise.resolve('0x123'),
      on: () => {},
      removeListener: () => {},
    };
  });
  
  cy.get('[data-testid=connect-wallet-btn]').click();
  cy.get('[data-testid=user-address]').should('contain', '0x123');
});

Cypress.Commands.add('purchaseAgent', (agentName: string) => {
  cy.get('[data-testid=nav-marketplace]').click();
  cy.get('[data-testid=search-input]').type(agentName);
  cy.get('[data-testid=buy-now-btn]').first().click();
  cy.get('[data-testid=confirm-purchase]').click();
  cy.get('[data-testid=success-message]').should('be.visible');
});

Cypress.Commands.add('verifyMetrics', () => {
  cy.get('[data-testid=total-agents]').should('be.visible');
  cy.get('[data-testid=total-users]').should('be.visible');
  cy.get('[data-testid=total-revenue]').should('be.visible');
  cy.get('[data-testid=revenue-chart]').should('be.visible');
  cy.get('[data-testid=users-chart]').should('be.visible');
});
