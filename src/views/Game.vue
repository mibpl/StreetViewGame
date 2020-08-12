<template>
  <div>
    <span>Game view</span>
    <p>Round {{ round }}</p>
    <Streets v-bind:mapPosition="mapPosition" />
    <MarkerMap @on-guess="guess($event)" />
  </div>
</template>

<script>
/*global google*/
import * as firebase from 'firebase/app';
import 'firebase/database';

// This is the main view for the actual game.
import Streets from '@/components/Streets.vue';
import MarkerMap from '@/components/MarkerMap.vue';

export default {
  name: 'Game',
  components: {
    Streets,
    MarkerMap,
  },
  data: function() {
    return {
      mapPosition: new google.maps.LatLng(37.75598, -122.41231),
      round: 0,
    };
  },
  methods: {
    guess: function(event) {
      const roomId = this.$route.params.roomId;
      firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId)
        .child('rounds')
        .child(this.round)
        .child(this.$store.state.uid)
        .set({
          latLng: event.latLng,
        });
    },
  },
};
</script>
