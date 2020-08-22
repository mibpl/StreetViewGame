<template>
  <div>
    <v-overlay v-show="everyoneGuessed()">
      <v-card light>
        <Leaderboard
          v-bind:players="players"
          v-bind:roundSummaries="roundSummaries"
          v-bind:roundsSize="roundsSize"
        />
        <RoundStatus
          v-bind:players="players"
          v-bind:guesses="guesses"
          v-bind:mapPosition="mapPosition"
          v-bind:summary="currentSummary"
        />
        <v-card-actions v-if="isChief()">
          <v-spacer></v-spacer>
          <v-btn tile dark color="red" v-on:click="nextround()">
            Next round!
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-overlay>
    <Streets v-bind:mapPosition="mapPosition" />
    <div id="map-overlay">
      <MarkerMap @on-guess="guess($event)" />
    </div>
  </div>
</template>

<style scoped>
#map-overlay {
  position: absolute;
  width: 400px;
  height: 200px;
  left: 0;

  bottom: 0;
  background-color: rgba(145, 10, 172, 0.5);
  z-index: 2;
  cursor: pointer;
  display: block;
  scale: 0.5;

  transition: all 0.2s ease-in-out;
}

#map-overlay:hover {
  width: 90%;
  height: 90%;
}
</style>

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
      mapPosition: { lat: 37.75598, lng: -122.41231 },
      round: 0,
      roomState: {},
      guesses: {},
      players: {},
      roundSummaries: {},
      roundsSize: 0,
      currentChief: '',
      currentSummary: {},
    };
  },
  mounted: function() {
    const roomId = this.$route.params.roomId;
    function cb(snapshot) {
      console.log('Game Snapshot changed:', snapshot.val());
      roomState = snapshot.val();
      this.round = roomState.current_round;
      this.mapPosition = roomState.rounds[this.round].map_position;
      this.currentSummary = roomState.rounds[this.round].summary;
      this.guesses = roomState.rounds[this.round].guesses;
      if (!this.guesses) {
        this.guesses = [];
      }
      if (!this.players) {
        this.players = [];
      }
      this.players = roomState.players;

      const summaries = {};
      for (const player_uuid in roomState.players) {
        summaries[player_uuid] = {};
        for (const round_id in roomState.rounds) {
          summaries[player_uuid][round_id] = 0;
        }
      }

      for (const round_id in roomState.rounds) {
        const round = roomState.rounds[round_id];
        const summary = maps.score(round.summary || {});
        for (const player_uuid in summary) {
          if (player_uuid in this.players) {
            summaries[player_uuid][round_id] = summary[player_uuid];
          }
        }
      }

      this.roundSummaries = summaries;
      this.roundsSize = roomState.rounds.length;
      this.currentChief = roomState.chief;
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

      const distance = {
        distance: maps.haversine_distance(this.mapPosition, event.latLng),
      };

      firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId)
        .child('rounds')
        .child(this.round)
        .child('summary')
        .child(this.$store.state.uid)
        .set(distance);
    },
    everyoneGuessed: function() {
      if (!this.players) return false;
      if (!this.guesses) return false;
      for (const player_uuid in this.players) {
        if (!(player_uuid in this.guesses)) return false;
      }
      return true;
    },
    jumpdebug: function() {
      function cb(pos) {
        console.log('Trying to jump to', pos);
        this.mapPosition = pos;
      }
      maps.chooseRandomStreetView(cb.bind(this));
    },
    isChief() {
      return this.$store.state.uid == this.currentChief;
    },
    nextround() {
      const roomId = this.$route.params.roomId;
      const newRound = this.round + 1;

      firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId)
        .child('current_round')
        .set(newRound);
    },
  },
};
</script>
