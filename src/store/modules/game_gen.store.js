import { GameGenerator } from '@/game_gen/game_generator';

const state = {
  shapes: [],
  gameGenerator: null,
};

const getters = {};

const mutations = {
  startNewGameGenerator(state, { roomPath }) {
    state.gameGenerator = new GameGenerator(roomPath, state.shapes);
  },
  cancelCurrentGenerator(state) {
    state.gameGenerator.cancel();
  },
  cleanUpGameGenerator(state) {
    state.gameGenerator = null;
  },
  setNewShapes(state, { newShapes }) {
    state.shapes = newShapes;
  },
};

const actions = {
  // If an existing generation was running it will be cancelled.
  async regenerateGame({ state, commit }, { roomPath }) {
    if (state.gameGenerator !== null) {
      commit('cancelCurrentGenerator');
      await state.gameGenerator.getWorkPromise();
    }
    commit('startNewGameGenerator', { roomPath });
  },
  async waitToFinishGeneration({ state, commit }) {
    await state.gameGenerator.getWorkPromise();
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
