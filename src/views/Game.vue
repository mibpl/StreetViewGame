<template>
  <div>
    <span>Game view</span>
    <template v-if="isChief()">
      <h1>Room leader section</h1>
      <button v-on:click="jumpdebug()">Jump!</button>
      <button v-on:click="nextround()">Next round!</button>
    </template>
    <p>Round {{ round }}</p>
    <Leaderboard v-bind:players="players" v-bind:roundSummaries="roundSummaries" />
    <RoundStatus
      v-bind:players="players"
      v-bind:guesses="guesses"
      v-bind:mapPosition="mapPosition"
    />
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
import RoundStatus from '@/components/RoundStatus.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import maps from '@/maps_util.js';

var roomState = {};

export default {
  name: 'Game',
  components: {
    Streets,
    MarkerMap,
    RoundStatus,
    Leaderboard,
  },
  data: function() {
    return {
      mapPosition: new google.maps.LatLng(37.75598, -122.41231),
      round: 0,
      roomState: {},
      guesses: {},
      players: {},
      roundSummaries: {},
    };
  },
  mounted: function() {
    const roomId = this.$route.params.roomId;
    function cb(snapshot) {
      console.log("Game Snapshot changed:", snapshot.val());
      roomState = snapshot.val();
      this.round = roomState.current_round;
      this.mapPosition = roomState.rounds[this.round].map_position;

      this.guesses = roomState.rounds[this.round].guesses;
      if (! this.guesses) {
        this.guesses = [];
      }
      if (! this.players) {
        this.players = [];
      }
      this.players = roomState.players;
      const summaries = {};
      for (const player_uuid in roomState.players)   {
        summaries[player_uuid] = {};
        for (const round_id in roomState.rounds) {
          summaries[player_uuid][round_id] = 0;
        }
      }
      
      for (const round_id in roomState.rounds) {
        const round = roomState.rounds[round_id];
        const summary = maps.score(round.summary || {});
        for (const player_uuid in summary) {
          summaries[player_uuid][round_id] = summary[player_uuid];
        }
      }
      this.roundSummaries = summaries;
    }
    firebase
      .database()
      .ref(process.env.VUE_APP_DB_PREFIX + roomId)
      .on('value', cb.bind(this));
  },
  methods: {
    guess: function(event) {
      const roomId = this.$route.params.roomId;
      firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId)
        .child('rounds')
        .child(this.round)
        .child('guesses')
        .child(this.$store.state.uid)
        .set({
          latLng: event.latLng,
        });
    },
    jumpdebug: function() {
      function cb(pos) {
        console.log('Trying to jump to', pos);
        this.mapPosition = pos;
      }
      maps.chooseRandomStreetView(cb.bind(this));
    },
    isChief() {
      return true;
    },
    nextround() {
      const roomId = this.$route.params.roomId;
      const newRound = this.round + 1;

      const summary = {};
      const guesses = roomState.rounds.[this.round].guesses;
      for (const [player, guess] of Object.entries(guesses)) {
        summary[player] = {
          distance: maps.haversine_distance(this.mapPosition, guess.latLng)
        }
      }

      firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId)
        .child('rounds')
        .child(this.round)
        .child('summary')
        .set(summary);

      firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId)
        .child('current_round')
        .set(newRound);
    },
  },
};
</script>
