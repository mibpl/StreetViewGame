import Vue from 'vue';
import * as firebase from 'firebase/app';
import 'firebase/analytics';
import 'firebase/auth';
import VueClipboard from 'vue-clipboard2';
import App from '@/App.vue';
import router from '@/router';
import vuetify from '@/plugins/vuetify';
import { newStore } from '@/store';
import maps from '@/maps_util.js';

Vue.config.productionTip = false;

Vue.use(VueClipboard);

let firebaseConfig;
console.log(process.env.VUE_APP_DB_ENV);
if (process.env.VUE_APP_DB_ENV === 'production') {
  firebaseConfig = {
    apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
    authDomain: process.env.VUE_APP_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL,
    projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
    storageBucket: process.env.VUE_APP_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.VUE_APP_FIREBASE_MESSAGING_SENSER_ID,
    appId: process.env.VUE_APP_FIREBASE_APP_ID,
    measurementId: process.env.VUE_APP_FIREBASE_MEASUREMENT_ID,
  };
} else {
  firebaseConfig = {
    apiKey: process.env.VUE_APP_FIREBASE_API_KEY,
    projectId: process.env.VUE_APP_FIREBASE_PROJECT_ID,
    databaseURL: process.env.VUE_APP_FIREBASE_DATABASE_URL,
    appId: 'placeholder',
  };
}
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

firebase.database.enableLogging(process.env.NODE_ENV !== 'production');

if (process.env.NODE_ENV === 'production') {
  firebase.analytics();
}

maps.init();

let store = newStore();
firebase.auth().onAuthStateChanged(function(user) {
  if (user) {
    let uid = user.uid;
    store.commit('auth/setUid', uid);
    console.log('User logged in.');
  } else {
    store.commit('auth/setUid', null);
    console.log('User somehow signed themselves out.');
  }
});

new Vue({
  router,
  vuetify,
  store,
  render: h => h(App),
}).$mount('#app');
