import Vue from 'vue';
import Vuex from 'vuex';
import Cookies from 'js-cookie';

Vue.use(Vuex);

export default function newStore() {
  return new Vuex.Store({
    state: {
      username: Cookies.get('username') || null,
    },
    mutations: {
      setUsername(state, username) {
        Cookies.set('username', username);
        state.username = username;
      },
    },
    actions: {},
    modules: {},
  });
}
