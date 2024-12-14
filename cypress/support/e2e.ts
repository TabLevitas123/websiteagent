// ***********************************************************
// This support/e2e.ts is processed and loaded automatically
// before your test files.
// ***********************************************************

import './commands'

beforeEach(() => {
  // Reset application state
  cy.task('db:reset')
  
  // Clear local storage
  cy.clearLocalStorage()
  
  // Clear cookies
  cy.clearCookies()
  
  // Reset IndexedDB
  indexedDB.deleteDatabase('WebsiteAgentDB')
})

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err) => {
  // Prevent Cypress from failing the test
  return false
})

// Add custom assertions
chai.Assertion.addMethod('withMessage', function (msg) {
  utils.flag(this, 'message', msg)
})

// Configure viewport
Cypress.config('viewportWidth', 1280)
Cypress.config('viewportHeight', 720)

// Configure default timeout
Cypress.config('defaultCommandTimeout', 10000)

// Configure retry options
Cypress.config('retries', {
  runMode: 2,
  openMode: 0,
})
