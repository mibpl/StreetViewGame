import Cookies from 'js-cookie';

const state = {
  username: Cookies.get('username') || null,
  uid: null,
};

const getters = {};

const mutations = {
  setUsername(state, username) {
    Cookies.set('username', username);
    state.username = username;
  },
  setUid(state, uid) {
    state.uid = uid;
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
