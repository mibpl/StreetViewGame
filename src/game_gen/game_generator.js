import firebase from 'firebase/app';
import 'firebase/database';
import { randomPoint } from '@turf/random';
import maps from '@/maps_util.js';
import { fetchShape } from '@/game_gen/shapes_util';
const parseKML = require('parse-kml');

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

  startGeneration(gameMode, shapeNames, kmlPoints, players, panoramaLookupPrecision) {
    console.log(
      'Starting game generation. gameMode: ',
      gameMode,
      'shapeNames: ',
      shapeNames,
      'length of kmlPoints: ',
      kmlPoints?.length,
      'players: ',
      players,
      'panoramaLookupPrecision: ',
      panoramaLookupPrecision,
      'generator: ',
      this,
    );
    if (kmlPoints != null && kmlPoints.length > 0) {
      this.work = this.fetchKmlAndGenerateGame(gameMode, kmlPoints, players, panoramaLookupPrecision);
    } else {
      this.work = this.fetchShapesAndGenerateGame(
        gameMode,
        shapeNames,
        players,
      );
    }
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

  async fetchShapesAndGenerateGame(gameMode, shapeNames, players) {
    if (this.cancelled) throw new CancelledError();

    await this.fetchShapes(shapeNames);
    console.log('Generating from shapes: ', this.shapes);

    if (this.cancelled) throw new CancelledError();
    await this.generateGameState(
      gameMode,
      players,
      this.generateValidPosition.bind(this),
    );
  }

  shuffleArray(array) {
    for (var i = array.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var temp = array[i];
      array[i] = array[j];
      array[j] = temp;
    }
    return array;
  }

  async generateValidPositionFromKmlPoints() {
    while(true) {
      if (this.kmlPoints.length == 0) {
        return null;
      }

      let p = this.kmlPoints[0];
      if (this.kmlPoints.length > 1) {
        p = this.kmlPoints.pop();
      }

      let actualPosition = await maps.getClosestPanorama(
        { lat: p[1], lng: p[0] },
        this.panoramaLookupPrecision,
      );
      if (actualPosition) return actualPosition;
      console.log("Discarding point with no panorama", p);
    }
    return null;
  }

  async fetchKmlAndGenerateGame(gameMode, kmlPoints, players, panoramaLookupPrecision) {
    this.kmlPoints = this.shuffleArray(kmlPoints);
    this.panoramaLookupPrecision = panoramaLookupPrecision;

    if (this.cancelled) throw new CancelledError();
    await this.generateGameState(
      gameMode,
      players,
      this.generateValidPositionFromKmlPoints.bind(this),
    );
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

  async generateGameState(gameMode, players, posGenFn) {
    if (gameMode == 'classic') {
      await this.generateClassicGameState(posGenFn);
    } else if (gameMode == 'rendezvous') {
      await this.generateRendezvousGameState(players, posGenFn);
    } else {
      console.error('Unrecognized gameMode: ', gameMode);
    }
  }

  // The player state for Rendezvous is encapsulated in the
  // rendezvous_data field in the database. The structure is as follows:
  // * rendezvous_data:
  //   * player_data: a dictionary mapping player_ids to their position
  //                  and history.
  //     * [player_id]: the key used to identify players in geoguessr.
  //       * map_position: object with {lat, lng} fields, storing the
  //                       initial/current player position.
  //       * position_history: array of objects with {lat, lng} fields,
  //                           storing the points the player visited, in order.
  //   * finished: a boolean indicating if the game is finished and a result
  //               screen should be shown to all players.
  async generateRendezvousGameState(players, posGenFn) {
    console.log('Generating Rendezvous game state for:', players);
    if (this.cancelled) throw new CancelledError();

    const rendezvous_player_data = {};
    for (const player of Object.keys(players)) {
      if (this.cancelled) throw new CancelledError();

      const position = await posGenFn();
      if (position === null) {
        throw new Error(
          'Could not find enough valid points within the selected ' +
            'locations. Try different location settings.',
        );
      }
      rendezvous_player_data[player] = {
        map_position: position,
        position_history: [position],
      };
    }
    const rendezvous_data = {
      player_data: rendezvous_player_data,
      finished: false,
    };

    if (this.cancelled) throw new CancelledError();

    try {
      const roomRef = firebase.database().ref(this.roomPath);
      await roomRef.child('rendezvous_data').set(rendezvous_data);
    } catch (error) {
      console.error(
        'Failed to write player locations to db with error: ',
        error,
      );
      throw new Error('Cannot connect to Firebase.');
    }
  }

  async generateClassicGameState(posGenFn) {
    console.log('Generating Classic game state');
    if (this.cancelled) throw new CancelledError();

    const rounds = {};
    for (let i = 0; i < this.roundNumber; i++) {
      if (this.cancelled) throw new CancelledError();

      const position = await posGenFn();
      if (position === null) {
        throw new Error(
          'Could not find enough valid points within the selected ' +
            'locations. Try different location settings.',
        );
      }
      rounds[i] = {
        map_position: position,
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
    const totalArea = this.shapes.reduce((acc, shape) => {
      if (this.cancelled) throw new CancelledError();
      return acc + shape.area();
    }, 0);

    const threshold = Math.random() * totalArea;

    let acc = 0;
    for (const shape of this.shapes) {
      if (this.cancelled) throw new CancelledError();
      acc += shape.area();
      if (acc > threshold) {
        return shape;
      }
    }
    console.error('Should not happen, failed to select a random shape.');
  }

  async generateValidPosition() {
    for (let i = 0; i < 60; i++) {
      if (this.cancelled) throw new CancelledError();
      let point = null;
      if (this.shapes.length > 0) {
        point = this.getRandomShape().randomPointWithin();
      } else {
        point = randomPoint(1).features[0];
      }
      if (this.cancelled) throw new CancelledError();
      const coords = point.geometry.coordinates;
      let actualPosition = await maps.getClosestPanorama({
        lat: coords[1],
        lng: coords[0],
      });
      if (actualPosition) {
        return actualPosition;
      }
    }
    return null;
  }
}
