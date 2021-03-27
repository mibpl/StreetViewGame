<template>
  <div id="game-view-container">
    <v-dialog max-width="60vw" v-model="instructionsVisible">
      <v-card>
        <v-card-title class="headline">
          Instructions
        </v-card-title>
        <v-card-text>
          Welcome to Rendezvous!<br />
          <h2>Objective</h2>
          Every player starts at a different location. The objective is for the
          players to meet up at a single location of your choosing (this means
          you must all be within 10m of each other).<br />
          <h2>Traveling</h2>
          You can move by using the regular Streetview movement. In addition,
          you can use the [number]KM buttons on the right of the screen to
          travel for (roughly) [number] kilometers in the direction you're
          facing (+- 0.1 radians, or 5.7 degrees). There are many caveats
          though: sometimes it won't be possible to find a streetview location
          in the direction you're facing, or you'll only be able to travel part
          of the requested distance, or you'll end up a bit off of where you
          were aiming for.<br />
          If you make a mistake, or Streetview takes you somewhere you didn't
          expect, you can fix this using the undo button (located underneath the
          KM buttons). Note that it only allows you to undo a single movement.
          <h2>Minimap</h2>
          You can use the minimap in the lower left corner as a tool to help you
          figure out where you are. You can set a marker on it for convenience.
          In contrast to the Classic game it has no other gameplay purpose.
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            id="confirm_btn"
            color="primary"
            @click="instructionsVisible = false"
          >
            Ok
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-overlay :value="finished" id="win-overlay">
      <v-card light height="100%">
        <v-card-title>
          Results
        </v-card-title>
        <v-container>
          <RendezvousResults
            v-bind:players="players"
            v-bind:player_data="playerData"
            v-bind:victory="victory"
          />
        </v-container>
        <v-card-actions class="card-bottom">
          <v-btn
            class="white--text"
            color="accent"
            v-if="isChief()"
            v-on:click="restartGame()"
          >
            Restart game
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-overlay>
    <v-container class="pa-0 mx-3 my-0">
      <v-row class="pa-0 ma-0">
        <v-col class="flex-grow-0 flex-shrink-1 pa-0 ml-0 mr-3">
          <v-btn
            class="white--text"
            small
            color="accent"
            v-on:click="instructionsVisible = true"
          >
            How to play
          </v-btn>
        </v-col>
        <v-col class="flex-grow-1 flex-shrink-0 pa-0 ma-0">
          <PlayerList
            @on-kick-player="kickPlayer($event)"
            v-bind:playerGuessStatus="players"
            v-bind:isChief="isChief()"
          />
        </v-col>
      </v-row>
    </v-container>
    <Streets
      v-bind:initialMapPosition="initialMapPosition"
      v-on:position_changed="positionChanged($event)"
      v-bind:jumpButtonsEnabled="true"
      v-bind:backToStartEnabled="false"
      v-bind:markerPositions="streetviewMarkerPositions"
    />
    <div id="map-overlay">
      <MarkerMap
        v-bind:deadlineTimestamp="deadlineTimestamp"
        v-bind:guessingEnabled="false"
        @on-click="teleport($event)"
      />
    </div>
    <PersistentDialog />
    <Dialog />
    <Toast />
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
  transition: all 0.2s ease-in-out;
}

#map-overlay:hover {
  width: 90%;
  height: 90%;
}

#win-overlay >>> .v-overlay__content {
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
import PlayerList from '@/components/PlayerList.vue';
import Dialog from '@/components/Dialog';
import PersistentDialog from '@/components/PersistentDialog';
import RendezvousResults from '@/components/RendezvousResults';
import Toast from '@/components/Toast';
import { roomObjectPath, signInGuard, roomGuard } from '@/firebase_utils.js';
import { mapMutations, mapActions } from 'vuex';
import maps_util from '@/maps_util';

var roomState = {};

export default {
  name: 'RendezvousGame',
  components: {
    Dialog,
    Streets,
    MarkerMap,
    PlayerList,
    PersistentDialog,
    RendezvousResults,
    Toast,
  },
  data: function() {
    return {
      initialMapPosition: { lat: 37.75598, lng: -122.41231 },
      initialMapPositionSet: false,
      finished: false,
      victory: false,
      roomState: {},
      players: {},
      playerData: {},
      currentChief: '',
      timeLimit: null,
      deadlineTimestamp: null,
      teleportEnabled: false,
      deadlineTimerSet: null,
      instructionsVisible: false,
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
        this.hidePersistentDialogAction();
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
            confirmAction: () => {
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
    streetviewMarkerPositions: function() {
      let markerPositions = [];
      if (Object.keys(this.playerData).length == 0) {
        return [];
      }
      let playerCurrentPosition = this.playerData[this.$store.state.auth.uid]
        .map_position;
      for (const [uuid, data] of Object.entries(this.players)) {
        let otherPlayerPosition = this.playerData[uuid].map_position;
        let distanceKm = maps_util.haversine_distance(
          playerCurrentPosition,
          otherPlayerPosition,
        );
        const username = data.username;
        let color = maps_util.colorForUuid(uuid, Object.keys(this.players)).substr(1);
        const playerPosition = {
          name: username,
          distanceKm: distanceKm,
          position: otherPlayerPosition,
          color: color,
        };
        markerPositions.push(playerPosition);
      }
      return markerPositions;
    },
  },
  methods: {
    refreshPage: function() {
      function cb(snapshot) {
        roomState = snapshot.val();

        if (!roomState.started) {
          this.cleanUpAndChangeView({ name: 'lobby' });
          return;
        }

        this.currentChief = roomState.chief;

        this.playerData = roomState.rendezvous_data.player_data;
        this.finished = roomState.rendezvous_data.finished;
        this.victory = roomState.rendezvous_data.victory;
        if (!this.initialMapPositionSet) {
          // The first time after loading the game we want to update the streetview position.
          // Afterwards the database is always secondary to streetview.
          this.initialMapPosition = this.playerData[
            this.$store.state.auth.uid
          ].map_position;
          this.positionHistory = this.playerData[
            this.$store.state.auth.uid
          ].position_history;
          this.initialMapPositionSet = true;
        }

        this.timeLimit = roomState.options?.time_limit || null;
        this.deadlineTimestamp = roomState.rendezvous_data.deadline || null;

        if (
          this.deadlineTimestamp == null &&
          this.timeLimit != null &&
          this.isChief()
        ) {
          this.roomDbRef
            .child('rendezvous_data')
            .child('deadline')
            .set(new Date().getTime() + this.timeLimit * 1000);
        }
        if (
          this.isChief() &&
          this.deadlineTimerSet == null &&
          this.deadlineTimestamp != null
        ) {
          setTimeout(() => {
            if (!this.checkForVictory()) {
              this.finishGame(false);
            }
          }, this.deadlineTimestamp - new Date().getTime());
          this.deadlineTimerSet = true;
        }

        if (!this.players) {
          this.players = [];
        }
        this.players = roomState.players;
        if (!this.finished && this.isChief()) {
          this.checkForVictory();
        }
      }
      this.roomDbRef.on('value', cb.bind(this));
    },
    positionChanged: function(event) {
      const position = { lat: event.lat, lng: event.lng };
      if (!this.initialMapPositionSet) {
        console.log('Received position event before initial position sync.');
        return;
      }
      this.positionHistory.push(position);
      this.roomDbRef
        .child('rendezvous_data')
        .child('player_data')
        .child(this.$store.state.auth.uid)
        .set(
          { map_position: position, position_history: this.positionHistory },
          error => {
            if (error) {
              console.log(error);
              this.$emit(
                'firebase_error',
                "Couldn't modify map position in database.",
              );
            }
          },
        );
    },
    cleanUpAndChangeView(location) {
      this.roomDbRef.off();
      this.$router.push(location);
    },
    checkForVictory: function() {
      if (this.finished) {
        return this.victory;
      }
      if (this.playerData == null) {
        return false;
      }
      if (Object.keys(this.playerData).length <= 1) return false;
      let max_distance_km = 0;
      for (const player_1 of Object.values(this.playerData)) {
        for (const player_2 of Object.values(this.playerData)) {
          let distance_km = maps_util.haversine_distance(
            player_1.map_position,
            player_2.map_position,
          );
          max_distance_km = Math.max(max_distance_km, distance_km);
        }
      }
      if (max_distance_km > 0.01) {
        return false;
      }
      // Within 10m.
      this.finishGame(true);
      return true;
    },
    finishGame: function(victory) {
      if (this.finished) {
        return;
      }
      this.roomDbRef
        .child('rendezvous_data')
        .update({ finished: true, victory: victory }, error => {
          if (error) {
            console.log(error);
            this.$emit(
              'firebase_error',
              "Couldn't modify 'finished' and 'victory' in database.",
            );
          }
        });
    },
    async teleport(newPosition) {
      if (!this.teleportEnabled) {
        return;
      }
      console.log('Teleport to ', newPosition);
      const newStreetviewPosition = await maps_util.getClosestPanorama(
        newPosition,
      );
      console.log('Found: ', newStreetviewPosition);
      if (newStreetviewPosition != null) {
        this.initialMapPosition = newStreetviewPosition;
      }
    },
    isChief() {
      return this.$store.state.auth.uid == this.currentChief;
    },
    async restartGame() {
      const snapshot = await this.roomDbRef.once('value');
      const roomState = snapshot.val();
      roomState.started = false;
      this.roomDbRef.set(roomState).catch(error => {
        this.showDialog({
          title: 'Could not restart the game',
          text: error,
        });
      });
    },
    kickPlayer(event) {
      const player_uuid = event.player_uuid;
      if (Object.keys(this.players).length <= 2) {
        this.showDialog({
          title: "Can't kick when two or fewer players left",
          text: 'Create a new game instead',
        });
        return;
      }
      let updateDict = {};
      updateDict[`players/${player_uuid}`] = null;
      updateDict[`rendezvous_data/player_data/${player_uuid}`] = null;
      this.roomDbRef.update(updateDict);
    },
    ...mapMutations('persistentDialog', ['showPersistentDialog']),
    ...mapActions('persistentDialog', ['hidePersistentDialogAction']),
    ...mapMutations('dialog', ['showDialog']),
  },
};
</script>
