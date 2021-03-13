const state = {
  visible: false,
  hide_timestamp_ms: 2000,
  color: 'gray',
  text: '',
};

const getters = {};

const mutations = {
  setToastVisibility(state, visible) {
    state.visible = visible;
  },
  setToastHideTimestampMs(state, hide_timestamp_ms) {
    state.hide_timestamp_ms = hide_timestamp_ms;
  },
  setToast(state, options) {
    state.text = options.text || '';
    state.color = options.color || 'gray';
  },
};

const actions = {
  // We need an action in order to be able to correctly set up the callback
  // to change state after a timer (vuex doesn't like mutations having timers
  // in them).
  showToast({ state, commit }, options) {
    const delay_ms = 2000;
    const hide_timestamp_ms = Date.now() + delay_ms;
    commit('setToast', options);
    commit('setToastHideTimestampMs', hide_timestamp_ms);
    commit('setToastVisibility', true);
    setTimeout(() => {
      // Snackbars support timers, but they don't support resetting the timer
      // when the text changes, so we roll our own support here.
      if (state.hide_timestamp_ms == hide_timestamp_ms) {
        // We're still the active timer.
        commit('setToastVisibility', false);
      }
      // Otherwise some other timer is active, so do nothing.
    }, delay_ms);
  },
};

export default {
  namespaced: true,
  state,
  getters,
  actions,
  mutations,
};
