import { firestore } from 'firebase-functions';

export const mibHelloWorld = firestore
  .document('/v3/')
  .onWrite((change, context) => {
    console.log(change, context);
  });
