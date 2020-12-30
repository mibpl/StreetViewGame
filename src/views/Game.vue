<template>
  <div id="game-view-container">
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
          <v-btn
            class="white--text"
            color="accent"
            v-if="isNotLastRound()"
            v-on:click="nextround()"
          >
            Next round!
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-overlay>
    <PlayerList
      @on-kick-player="kickPlayer($event)"
      v-bind:playerGuessStatus="players"
      v-bind:isChief="isChief()"
    />
    <Streets v-bind:mapPosition="mapPosition" />
    <div id="map-overlay">
      <MarkerMap
        @on-guess="guess($event)"
        v-bind:deadlineTimestamp="deadlineTimestamp"
      />
    </div>
    <PersistentDialog />
  </div>
</template>

<style scoped>
#game-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  position: absolute;
}

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
import * as firebase from 'firebase/app';
import 'firebase/database';

// This is the main view for the actual game.
import Streets from '@/components/Streets.vue';
import MarkerMap from '@/components/MarkerMap.vue';
import RoundStatus from '@/components/RoundStatus.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import PlayerList from '@/components/PlayerList.vue';
import PersistentDialog from '@/components/PersistentDialog';
import maps from '@/maps_util.js';
import { roomObjectPath, signInGuard, roomGuard } from '@/firebase_utils.js';
import { mapMutations } from 'vuex';

var roomState = {};

export default {
  name: 'Game',
  components: {
    Streets,
    MarkerMap,
    RoundStatus,
    Leaderboard,
    PlayerList,
    PersistentDialog,
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
      deadlineTimestamp: null,
      timeLimit: null,
    };
  },
  mounted: function() {
    this.showPersistentDialog({
      text: 'Connecting...',
    });
    signInGuard(this.$store)
      .catch(error => {
        console.log('Error getting user UID:', error);
        this.showPersistentDialog({
          text: 'Unable to connect to Firebase :/ Try refreshing later.',
        });
      })
      .then(() => {
        const uid = this.$store.state.uid;
        const roomId = this.$route.params.roomId;
        return roomGuard(roomId, uid);
      })
      .then(() => {
        this.hidePersistentDialog();
        this.refreshPage();
      })
      .catch(error_room => {
        if (error_room === null) {
          // Room doesn't exist.
          this.showDialog({
            title: "Room doesn't exist",
            text:
              "Room you are trying to access doesn't exist. " +
              'Use correct link or create a new room.',
            confirmAction: function() {
              this.cleanUpAndChangeView({ name: 'main' });
            },
          });
        } else {
          // User is not in the room. Redirect them to the join link.
          this.cleanUpAndChangeView({
            name: 'join',
            params: { roomId: this.$route.params.roomId },
          });
        }
      });
  },
  methods: {
    refreshPage: function() {
      const roomId = this.$route.params.roomId;
      function cb(snapshot) {
        console.log('Game Snapshot changed:', snapshot.val());
        roomState = snapshot.val();
        this.currentChief = roomState.chief;
        this.timeLimit = roomState.time_limit || null;

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

        for (const player_uuid in this.players) {
          this.players[player_uuid].guessedThisRound =
            player_uuid in this.guesses;
        }

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

        this.deadlineTimestamp = roomState.rounds[this.round].deadline || null;

        if (
          this.deadlineTimestamp == null &&
          this.timeLimit != null &&
          this.isChief()
        ) {
          firebase
            .database()
            .ref(roomObjectPath(roomId))
            .child('rounds')
            .child(roomState.current_round)
            .child('deadline')
            .set(new Date().getTime() + this.timeLimit * 1000);
        }

        this.roundSummaries = summaries;
        this.roundsSize = roomState.rounds.length;
      }
      firebase
        .database()
        .ref(roomObjectPath(roomId))
        .on('value', cb.bind(this));
    },
    guess: function(event) {
      const roomId = this.$route.params.roomId;
      firebase
        .database()
        .ref(roomObjectPath(roomId))
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
        .ref(roomObjectPath(roomId))
        .child('rounds')
        .child(this.round)
        .child('summary')
        .child(this.$store.state.uid)
        .set(distance);
    },
    cleanUpAndChangeView(location) {
      firebase
        .database()
        .ref(roomObjectPath(this.$route.params.roomId))
        .off();
      this.$router.push(location);
    },
    everyoneGuessed: function() {
      if (Object.keys(this.players).length == 0) return false;
      if (Object.keys(this.guesses).length == 0) return false;
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
    isNotLastRound() {
      return this.round < this.roundsSize - 1;
    },
    kickPlayer(event) {
      const player_uuid = event.player_uuid;
      const roomId = this.$route.params.roomId;
      firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId)
        .child('players')
        .child(player_uuid)
        .remove();
    },
    ...mapMutations(['showPersistentDialog', 'hidePersistentDialog']),
  },
};
</script>
