describe('Chat Features', () => {
  const TEST_USER = `test_${Date.now()}`;

  before(() => {
    cy.visit('/');
    cy.get('#username').type(TEST_USER);
    cy.get('#join-btn').click();
    cy.contains(`${TEST_USER} joined`, { timeout: 5000 });
  });

  it('sends and displays messages', () => {
    const msg = `Test ${Date.now()}`;
    cy.get('#message-input').type(msg);
    cy.get('#send-btn').click();
    cy.contains(msg).should('exist');
  });
});