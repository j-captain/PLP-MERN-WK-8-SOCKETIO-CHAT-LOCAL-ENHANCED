describe('Chat Application E2E', () => {
  beforeEach(() => {
    cy.visit('http://localhost:3000');
  });

  it('allows user to join chat and send messages', () => {
    cy.get('#username').type('testUser');
    cy.get('#join-btn').click();
    
    cy.get('#message-input').type('Hello Cypress!');
    cy.get('#send-btn').click();
    
    cy.contains('.message', 'Hello Cypress!').should('exist');
    cy.contains('.message-user', 'testUser').should('exist');
  });
});