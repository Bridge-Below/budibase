context('Create an Application', () => {

    beforeEach(() => {
        cy.server()
        cy.visit(`localhost:${Cypress.env("PORT")}/_builder`)
    })

    // https://on.cypress.io/interacting-with-elements

    it('should create a new application', () => {
        // https://on.cypress.io/type
        cy.createApp('My Cool App', 'This is a description')

        cy.visit(`localhost:${Cypress.env("PORT")}/_builder`)

        cy.contains('My Cool App').should('exist')
    })
})
