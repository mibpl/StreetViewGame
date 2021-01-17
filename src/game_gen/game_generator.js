import * as firebase from 'firebase/app';
import 'firebase/database';
import { randomPoint } from '@turf/random';
import maps from '@/maps_util.js';
import { fetchShape } from '@/game_gen/shapes_util';

export class CancelledError extends Error {
  constructor() {
    super('The operation was cancelled.');
    this.name = 'CancelledError';
  }
}

// Generates map_positions for a game at given firebase reference.
// Will overwrite any rounds previously generated for the game.
//
// Works only for a single generation. Not reusable after it finished/was
// cancelled.
//
// This object is stored in Vuex store. Do not modify it's state in implicitly
// const functions.
export class GameGenerator {
  constructor({
    roomPath,
    getShapeFromCacheFn,
    putShapeInCacheFn,
    getShapeOptsFn,
  }) {
    this.cancelled = false;

    this.roomPath = roomPath;
    this.roundNumber = 5;
    this.getShapeFromCacheFn = getShapeFromCacheFn;
    this.putShapeInCacheFn = putShapeInCacheFn;
    this.getShapeOptsFn = getShapeOptsFn;
  }

  startGeneration(shapeNames) {
    console.log('Starting game generation...');
    this.work = this.fetchShapesAndGenerateGame(shapeNames);
  }

  // Cancelling will stop the game generation potentially leaving the Firebase
  // database with not all rounds generated.
  cancel() {
    console.log('Game generation cancelled');
    this.cancelled = true;
  }

  // Waits for the genertion to end (works both after cancelation and for just
  // finishing the generation).
  async waitToFinish() {
    await this.work;
  }

  async fetchShapesAndGenerateGame(shapeNames) {
    if (this.cancelled) throw new CancelledError();
    await this.fetchShapes(shapeNames);
    console.log('Generating from shapes: ', this.shapes);

    if (this.cancelled) throw new CancelledError();
    await this.generateRounds();
  }

  async fetchShapes(shapeNames) {
    if (this.cancelled) throw new CancelledError();
    this.shapes = [];
    for (const shapeName of shapeNames) {
      if (this.cancelled) throw new CancelledError();
      let shapeObj = this.getShapeFromCacheFn(shapeName);
      if (!shapeObj) {
        let shapeOpts = this.getShapeOptsFn(shapeName);
        if (!shapeOpts) {
          console.warn(
            'A shape was chosen that we know nothing about. This is ' +
              'expected for chief who refreshed their lobby view and will ' +
              'fix itself automatically in such case.',
          );
          continue;
        }
        shapeObj = await fetchShape(shapeOpts.relative_path);
        if (!shapeObj) {
          throw Error(`Shape ${shapeName} has incorrect data online.`);
        }
        this.putShapeInCacheFn(shapeName, shapeObj);
      }
      this.shapes.push(shapeObj);
    }
    if (this.cancelled) throw new CancelledError();
    this.shapes.sort((shapeA, shapeB) => {
      if (shapeA.name() < shapeB.name()) {
        return -1;
      }
      if (shapeA.name() > shapeB.name()) {
        return 1;
      }
      return 0;
    });
  }

  async generateRounds() {
    if (this.cancelled) throw new CancelledError();

    const rounds = {};
    for (let i = 0; i < this.roundNumber; i++) {
      if (this.cancelled) throw new CancelledError();

      const position = await this.generateValidPosition();
      if (position === null) {
        throw new Error(
          'Could not find enough valid points within the selected ' +
            'locations. Try different location settings.',
        );
      }
      rounds[i] = {
        map_position: position.toJSON(),
      };
    }

    if (this.cancelled) throw new CancelledError();

    try {
      const roomRef = firebase.database().ref(this.roomPath);
      await roomRef.child('rounds').set(rounds);
    } catch (error) {
      console.error('Failed to write rounds to db with error: ', error);
      throw new Error('Cannot connect to Firebase.');
    }
  }

  getRandomShape() {
    // The areas are in meters but they should still fit in 53 bites.
    console.log("selecting random shape out of", this.shapes);
    const totalArea = this.shapes.reduce((acc, shape) => {
      if (this.cancelled) throw new CancelledError();
      return acc + shape.area();
    }, 0);

    console.log("total area", totalArea);

    const threshold = Math.random() * totalArea;

    console.log("treshold", threshold);
    let acc = 0;
    for (const shape of this.shapes) {
      if (this.cancelled) throw new CancelledError();
      acc += shape.area();
      console.log("acc", acc);
      if (acc > threshold) {
        return shape;
      }
    }
    console.error('Should not happen, failed to select a random shape.');
  }

  async generateValidPosition() {
    for (let i = 0; i < 30; i++) {
      if (this.cancelled) throw new CancelledError();
      let point = null;
      if (this.shapes.length > 0) {
        point = this.getRandomShape().randomPointWithin();
      } else {
        point = randomPoint(1).features[0];
      }
      if (this.cancelled) throw new CancelledError();
      let actualPosition = await maps.getClosestPanorama(
        point.geometry.coordinates,
      );
      if (actualPosition) {
        return actualPosition;
      }
    }
    return null;
  }
}
