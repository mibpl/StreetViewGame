const state = {
  visible: false,
  text: '',
};

const getters = {};

const mutations = {
  showPersistentDialog(state, options) {
    state.text = options.text || '';
    state.visible = true;
  },
  hidePersistentDialog(state) {
    state.visible = false;
  },
};

const actions = {};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
