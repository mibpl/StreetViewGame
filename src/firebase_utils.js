import * as firebase from 'firebase/app';
import 'firebase/auth';

export function roomObjectPath(roomId) {
  return process.env.VUE_APP_DB_PREFIX + roomId;
}

// Sign the user in on Firebase and save their UID in the store.
//
// If UID is already present in the store, do nothing.  This function should be
// called on loading of each View (to handle page refresh). Only once the UID
// is fetched should the page try to actually load stuff.
//
// If the error callback is triggered, it means we could not connect to
// Firebase or are in unexpected (inconsistent) state. Probably best to not let
// user interact with the application in any way.
export function signUserIn(store, successCallback, errorCallback) {
  if (store.state.uid) {
    successCallback();
    return;
  }
  firebase
    .auth()
    .signInAnonymously()
    .then(function(userCreds) {
      if (userCreds.user.uid) {
        store.commit('setUid', userCreds.user.uid);
        successCallback();
      } else {
        errorCallback('got empty UID from Firebase');
      }
    })
    .catch(errorCallback);
}
