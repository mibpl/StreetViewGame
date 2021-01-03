import { GameGenerator, CancelledError } from '@/game_gen/game_generator';

const state = {
  currentlySelectedShapes: [],
  availableShapes: {},
  cachedShapes: {},
  gameGenerator: null,
  startedRegenerations: [],
};

const getters = {};

const mutations = {
  setNewGameGenerator(state, { gameGenerator }) {
    state.gameGenerator = gameGenerator;
  },
  startGameGenerator(state, { shapeNames }) {
    state.gameGenerator.startGeneration(shapeNames);
  },
  cancelCurrentGenerator(state) {
    state.gameGenerator.cancel();
  },
  cleanUpGameGenerator(state) {
    state.gameGenerator = null;
  },
  addStartedRegeneration(state, { regeneration }) {
    state.startedRegenerations.push(regeneration);
  },
  cleanUpStartedRegenerations(state) {
    state.startedRegenerations = [];
  },
  addCachedShape(state, { shapeName, shapeObj }) {
    state.cachedShapes[shapeName] = shapeObj;
  },
  setSelectedShapes(state, { shapes }) {
    state.currentlySelectedShapes = shapes;
  },
  setAvailableShapes(state, { shapes }) {
    state.availableShapes = shapes;
  },
};

const actions = {
  // If an existing generation was running it will be cancelled.
  triggerGameRegeneration({ state, commit, dispatch }, { roomPath }) {
    let cancelledGenerator = null;
    if (state.gameGenerator) {
      cancelledGenerator = state.gameGenerator;
      commit('cancelCurrentGenerator');
    }
    const gameGenerator = new GameGenerator({
      roomPath,
      getShapeFromCacheFn: shapeName => {
        if (!(shapeName in state.cachedShapes)) {
          return null;
        }
        return state.cachedShapes[shapeName];
      },
      putShapeInCacheFn: (shapeName, shapeObj) => {
        commit('addCachedShape', { shapeName, shapeObj });
      },
      getShapeOptsFn: shapeName => {
        if (!(shapeName in state.availableShapes)) {
          return null;
        }
        return state.availableShapes[shapeName];
      },
    });
    commit('setNewGameGenerator', { gameGenerator });
    const regeneration = dispatch('regenerateGame', { cancelledGenerator });
    commit('addStartedRegeneration', { regeneration });
  },
  async regenerateGame({ state, commit }, { cancelledGenerator }) {
    if (cancelledGenerator) {
      try {
        await cancelledGenerator.waitToFinish();
      } catch (error) {
        if (error instanceof CancelledError) {
          // expected
        } else {
          console.warn('Cancelled generation has thrown an error:', error);
        }
      }
    }
    commit('startGameGenerator', {
      shapeNames: state.currentlySelectedShapes,
    });
  },
  async waitToFinishGeneration({ state, commit }) {
    // First wait for current regenerations to actually start.
    const currentRegenerations = state.startedRegenerations;
    commit('cleanUpStartedRegenerations');
    await Promise.all(currentRegenerations);
    // Then wait for the actual regeneration.
    await state.gameGenerator.waitToFinish();
    commit('cleanUpGameGenerator');
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
