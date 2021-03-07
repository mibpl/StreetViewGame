import Cookies from 'js-cookie';

const state = {
};

const getters = {
  getRendezvousEnabled(state) {
    return Cookies.get('rendezvous_enabled') == "true";
  },
};

const mutations = {
  setRendezvousEnabled(state, value) {
    Cookies.set('rendezvous_enabled', value);
  },
};

export default {
  namespaced: true,
  getters,
  state,
  mutations,
};
