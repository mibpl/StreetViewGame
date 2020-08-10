import Vue from 'vue';
import Vuex from 'vuex';
import Cookies from 'js-cookie';
import * as firebase from 'firebase/app';
import 'firebase/auth';

Vue.use(Vuex);

export function trySignIn() {
  firebase
    .auth()
    .signInAnonymously()
    .catch(function(error) {
      console.log("Couldn't connect to Firebase :(");
      console.log(error);
    });
}

export function newStore() {
  let store = new Vuex.Store({
    state: {
      username: Cookies.get('username') || null,
      uid: null,
    },
    mutations: {
      setUsername(state, username) {
        Cookies.set('username', username);
        state.username = username;
      },
      setUid(state, uid) {
        state.uid = uid;
      },
    },
    actions: {},
    modules: {},
  });

  trySignIn();
  firebase.auth().onAuthStateChanged(function(user) {
    if (user) {
      let uid = user.uid;
      store.commit('setUid', uid);
      console.log('User logged in.');
    } else {
      store.commit('setUid', null);
      console.log('User somehow signed themselves out.');
    }
  });

  return store;
}
