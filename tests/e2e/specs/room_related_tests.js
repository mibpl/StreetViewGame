import firebase from 'firebase/app';
import 'firebase/auth';
import 'firebase/database';
import { hri } from 'human-readable-ids';

beforeEach(() => {
  cy.stub(firebase, 'auth').returns({
    signInAnonymously: cy.stub().resolves(),
    // Call user-provided callback immediately.
    onAuthStateChanged: callback => {
      const user = {
        uid: 'testUid',
      };
      callback(user);
    },
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

describe('Room creation flow', () => {
  context('chief user', () => {
    it('can create new room', () => {
      cy.stub(hri, 'random').returns('test-room-creation');
      cy.setCookie('username', 'chief_user');
      cy.visit('/');
      cy.get('#create_room_btn').click();
    });
  });
});
