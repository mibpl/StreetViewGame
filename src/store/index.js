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
      dialog: {
        visible: false,
        title: '',
        text: '',
        confirmAction: null,
      },
      persistentDialog: {
        visible: false,
        text: '',
      },
    },
    mutations: {
      setUsername(state, username) {
        Cookies.set('username', username);
        state.username = username;
      },
      setUid(state, uid) {
        state.uid = uid;
      },
      // Functions related to dialog.
      setDialogVisibility(state, visible) {
        state.dialog.visible = visible;
      },
      showDialog(state, options) {
        state.dialog.title = options.title || '';
        state.dialog.text = options.text || '';
        state.dialog.confirmAction = options.confirmAction || null;
        state.dialog.visible = true;
      },
      // Functions related to persistent dialog.
      showPersistentDialog(state, options) {
        state.persistentDialog.text = options.text || '';
        state.persistentDialog.visible = true;
      },
      hidePersistentDialog(state) {
        state.persistentDialog.visible = false;
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
