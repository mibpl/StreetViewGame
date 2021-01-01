import Vue from 'vue';
import Vuex from 'vuex';
import modules from '@/store/modules';

Vue.use(Vuex);
const debug = process.env.NODE_ENV !== 'production';

export function newStore(strict = debug) {
  let store = new Vuex.Store({
    modules,
    strict,
  });

  return store;
}
