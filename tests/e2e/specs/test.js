// https://docs.cypress.io/api/introduction/api.html
import firebase from 'firebase/app';
import 'firebase/auth';

beforeEach(() => {
  cy.stub(firebase, 'auth').returns({
    signInAnonymously: cy.stub().resolves(),
    onAuthStateChanged: cy.stub(),
  });
});

Cypress.on('window:before:load', win => {
  const google = {
    maps: {
      StreetViewService: cy.stub(),
      LatLng: cy.stub(),
      StreetViewPreference: cy.stub(),
    },
  };

  // Theoretically we block maps.googleapis.com in cypress.json but just in
  // case make this property unchangeable.
  Object.defineProperty(win, 'google', {
    configurable: false,
    get: () => google,
    set: () => {},
  });
});

describe('Main view', () => {
  it('propagates username from cookie to root page', () => {
    cy.setCookie('username', 'the_user');
    cy.visit('/');
    cy.get('input[name=username]').should('have.value', 'the_user');
  });
  it('propagates username from cookie to join page', () => {
    cy.setCookie('username', 'the_user');
    cy.visit('/join/room');
    cy.get('input[name=username]').should('have.value', 'the_user');
  });
  it('clears username is cleared after cookie is cleared', () => {
    cy.setCookie('username', 'the_user');
    cy.visit('/');
    cy.get('input[name=username]').should('have.value', 'the_user');
    cy.clearCookies();
    cy.visit('/');
    cy.get('input[name=username]').should('be.empty');
  });
});
