import * as firebase from 'firebase/app';
import 'firebase/database';
import maps from '@/maps_util.js';

// Generates map_positions for a game at given firebase reference.
// Will overwrite any rounds previously generated for the game.
//
// This object is stored in Vuex store. Do not modify it's state in implicitly
// const functions.
export class GameGenerator {
  constructor(roomPath, shapes) {
    this.cancelled = false;

    this.roomPath = roomPath;
    this.shapes = shapes;

    console.log('Starting game generation...');
    this.work = this.generateRounds();
  }

  async generateRounds() {
    const rounds = {};
    for (let i = 0; i < 5; i++) {
      rounds[i] = {
        map_position: (await maps.aChooseRandomStreetView()).toJSON(),
      };
    }

    try {
      const roomRef = firebase.database().ref(this.roomPath);
      await roomRef.child('rounds').set(rounds);
    } catch (error) {
      console.error('Failed to write rounds to db with error: ', error);
      throw new Error('Cannot connect to Firebase.');
    }
  }

  // Cancelling will stop the game generation potentially leaving the Firebase
  // database with not all rounds generated.
  cancel() {
    console.log('Game generation cancelled');
    this.cancelled = true;
  }

  // Returns the promise that is performing the game generation. It can be
  // cancelled through the cancel() function.
  getWorkPromise() {
    return this.work;
  }
}
