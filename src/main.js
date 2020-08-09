import Vue from 'vue';
import * as firebase from 'firebase/app';
import App from '@/App.vue';
import router from '@/router';
import vuetify from '@/plugins/vuetify';
import { newStore } from '@/store';

Vue.config.productionTip = false;

let firebaseConfig;
console.log(process.env);
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

if (process.env.NODE_ENV === 'production') {
  firebase.analytics();
}

new Vue({
  router,
  vuetify,
  store: newStore(),
  render: h => h(App),
}).$mount('#app');
