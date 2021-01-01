const state = {
  visible: false,
  title: '',
  text: '',
  confirmAction: null,
};

const getters = {};

const mutations = {
  setDialogVisibility(state, visible) {
    state.visible = visible;
  },
  showDialog(state, options) {
    state.title = options.title || '';
    state.text = options.text || '';
    state.confirmAction = options.confirmAction || null;
    state.visible = true;
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
