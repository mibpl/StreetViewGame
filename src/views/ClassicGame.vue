<template>
  <div id="game-view-container">
    <v-overlay :value="everyoneGuessed()" id="leaderboard-overlay">
      <v-card light height="100%">
        <v-card-title>
          Leaderboard
        </v-card-title>
        <v-container>
          <v-row no-gutters style="height: 80vh">
            <v-col cols="6">
              <Leaderboard
                v-bind:players="players"
                v-bind:roundSummaries="roundSummaries"
                v-bind:roundsSize="roundsSize"
              />
            </v-col>
            <v-col cols="6">
              <RoundStatus
                v-bind:players="players"
                v-bind:guesses="guesses"
                v-bind:mapPosition="mapPosition"
                v-bind:summary="currentSummary"
              />
            </v-col>
          </v-row>
        </v-container>
        <v-card-actions class="card-bottom">
          <v-btn
            class="white--text"
            color="accent"
            v-if="!isNotLastRound() && isChief()"
            v-on:click="restartGame()"
          >
            Restart game
          </v-btn>
          <v-btn
            class="white--text"
            color="accent"
            v-if="isNotLastRound() && isChief()"
            v-on:click="nextround()"
          >
            Next round!
          </v-btn>
          <v-card-text v-if="isNotLastRound() && !isChief()">
            <div class="font-weight-light font-italic">
              Waiting for {{ chiefName }} to start next round...
            </div>
          </v-card-text>
        </v-card-actions>
      </v-card>
    </v-overlay>
    <PlayerList
      @on-kick-player="kickPlayer($event)"
      v-bind:playerGuessStatus="players"
      v-bind:isChief="isChief()"
    />
    <Streets
      v-bind:initialMapPosition="mapPosition"
      v-bind:jumpButtonsEnabled=false
    />
    <div id="map-overlay">
      <MarkerMap
        @on-guess="guess($event)"
        v-bind:deadlineTimestamp="deadlineTimestamp"
        v-bind:guessingEnabled="true"
      />
    </div>
    <PersistentDialog />
    <Dialog />
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

#leaderboard-overlay >>> .v-overlay__content {
  width: 80vw;
  height: 90vh;
}

.card-bottom {
  position: absolute;
  bottom: 0;
  right: 0;
}
</style>

<script>
import firebase from 'firebase/app';

// This is the main view for the actual game.
import Streets from '@/components/Streets.vue';
import MarkerMap from '@/components/MarkerMap.vue';
import RoundStatus from '@/components/RoundStatus.vue';
import Leaderboard from '@/components/Leaderboard.vue';
import PlayerList from '@/components/PlayerList.vue';
import Dialog from '@/components/Dialog';
import PersistentDialog from '@/components/PersistentDialog';
import maps from '@/maps_util.js';
import { roomObjectPath, signInGuard, roomGuard } from '@/firebase_utils.js';
import { mapMutations } from 'vuex';

var roomState = {};

export default {
  name: 'ClassicGame',
  components: {
    Dialog,
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
        const uid = this.$store.state.auth.uid;
        return roomGuard(this.roomId, uid);
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
            params: { roomId: this.roomId },
          });
        }
      });
  },
  computed: {
    roomDbRef: function() {
      return firebase.database().ref(this.roomDbPath);
    },
    roomDbPath: function() {
      return roomObjectPath(this.roomId);
    },
    roomId: function() {
      return this.$route.params.roomId;
    },
    chiefName: function() {
      return this.players[this.currentChief].username;
    },
  },
  methods: {
    refreshPage: function() {
      function cb(snapshot) {
        console.log('Game Snapshot changed:', snapshot.val());
        roomState = snapshot.val();

        if (!roomState.started) {
          this.cleanUpAndChangeView({ name: 'lobby' });
          return;
        }

        this.currentChief = roomState.chief;
        this.timeLimit = roomState.options?.time_limit || null;

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
          this.roomDbRef
            .child('rounds')
            .child(roomState.current_round)
            .child('deadline')
            .set(new Date().getTime() + this.timeLimit * 1000);
        }

        this.roundSummaries = summaries;
        this.roundsSize = roomState.rounds.length;
      }
      this.roomDbRef.on('value', cb.bind(this));
    },
    guess: function(event) {
      const distance = {
        distance: maps.haversine_distance(this.mapPosition, event.latLng),
      };

      this.roomDbRef
        .child('rounds')
        .child(this.round)
        .child('summary')
        .child(this.$store.state.auth.uid)
        .set(distance);

      this.roomDbRef
        .child('rounds')
        .child(this.round)
        .child('guesses')
        .child(this.$store.state.auth.uid)
        .set({
          latLng: event.latLng,
        });
    },
    cleanUpAndChangeView(location) {
      this.roomDbRef.off();
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
      return this.$store.state.auth.uid == this.currentChief;
    },
    nextround() {
      const newRound = this.round + 1;
      this.roomDbRef.child('current_round').set(newRound);
    },
    isNotLastRound() {
      return this.round < this.roundsSize - 1;
    },
    async restartGame() {
      const snapshot = await this.roomDbRef.once('value');
      const roomState = snapshot.val();
      roomState.started = false;
      roomState.finished = false;
      roomState.current_round = 0;
      roomState.rounds = {};
      this.roomDbRef.set(roomState).catch(error => {
        this.showDialog({
          title: 'Could not restart the game',
          text: error,
        });
      });
    },
    kickPlayer(event) {
      const player_uuid = event.player_uuid;
      this.roomDbRef
        .child('players')
        .child(player_uuid)
        .remove();
    },
    ...mapMutations('persistentDialog', [
      'showPersistentDialog',
      'hidePersistentDialog',
    ]),
    ...mapMutations('dialog', ['showDialog']),
  },
};
</script>
