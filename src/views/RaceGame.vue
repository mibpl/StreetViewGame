<template>
  <div id="game-view-container">
    <v-dialog max-width="60vw" v-model="instructionsVisible">
      <v-card>
        <v-card-title class="headline">
          Instructions
        </v-card-title>
        <v-card-text>
          Welcome to the rally!<br />
          Figure it out. Jeez.
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
    <v-dialog max-width="60vw" v-model="giveUpVisible">
      <v-card>
        <v-card-title class="headline">
          Are you sure you want to give up?
        </v-card-title>
        <v-card-text>
          Giving up will take you to the end screen, and you won't be able to go
          back.
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn
            id="confirm_btn"
            color="red"
            @click="
              giveUpVisible = false;
              finishGame(false);
            "
          >
            Give up
          </v-btn>
          <v-btn id="confirm_btn" color="blue" @click="giveUpVisible = false">
            Keep playing
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <v-overlay :value="finished" id="win-overlay">
      <v-card light height="100%" style="position: relative">
        <v-card-title>
          Results
        </v-card-title>
        <RendezvousResults
          v-bind:players="players"
          v-bind:player_data="playerData"
          v-bind:goal="goalLocation"
        />
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
            color="primary"
            v-on:click="instructionsVisible = true"
          >
            How to play
          </v-btn>
        </v-col>
        <v-col
          v-if="isChief()"
          class="flex-grow-0 flex-shrink-1 pa-0 ml-0 mr-3"
        >
          <v-btn
            class="white--text"
            small
            color="primary"
            v-on:click="giveUpVisible = true"
          >
            Give up
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
      v-bind:playerMarkers="streetviewMarkerPositions"
      v-bind:beaconMarkers="beaconMarkers"
    />
    <div id="map-overlay">
      <MarkerMap
        v-bind:deadlineTimestamp="deadlineTimestamp"
        v-bind:guessingEnabled="false"
        v-bind:beaconMarkers="beaconMarkers"
      />
    </div>
    <div id="board-overlay">
      <RankBoard 
        v-bind:playerPositions="streetviewMarkerPositions"
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

#board-overlay {
  position: absolute;
  /*width: 400px;*/
  /*height: 200px;*/
  right: 0;
  top: 0;
  /*background-color: rgba(172, 129, 10, 0.5);*/
  z-index: 2;
  cursor: pointer;
  display: block;
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

#beacon-button {
  position: absolute;
  z-index: 2;
  left: 10px;
  width: 50px;
  height: 50px;
  top: 50px;
}
</style>

<script>
import firebase from 'firebase/app';

// This is the main view for the actual game.
import Streets from '@/components/Streets.vue';
import MarkerMap from '@/components/MarkerMap.vue';
import PlayerList from '@/components/PlayerList.vue';
import RankBoard from '@/components/RankBoard.vue';
import Dialog from '@/components/Dialog';
import PersistentDialog from '@/components/PersistentDialog';
import RendezvousResults from '@/components/RendezvousResults';
import Toast from '@/components/Toast';
import { roomObjectPath, signInGuard, roomGuard } from '@/firebase_utils.js';
import { mapMutations, mapActions } from 'vuex';
import maps_util from '@/maps_util';
import _ from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import { randomPoint } from '@turf/random';

var roomState = {};

export default {
  name: 'RaceGame',
  components: {
    Dialog,
    Streets,
    MarkerMap,
    PlayerList,
    PersistentDialog,
    RendezvousResults,
    Toast,
    RankBoard,
  },
  data: function() {
    return {
      // See Streets.vue panorama initialization for why this is empty.
      initialMapPosition: {},
      initialMapPositionSet: false,
      finished: false,
      victory: false,
      roomState: {},
      players: {},
      playerData: {},
      positionHistory: [],
      currentChief: '',
      timeLimit: null,
      deadlineTimestamp: null,
      teleportEnabled: false,
      deadlineTimerSet: null,
      instructionsVisible: false,
      giveUpVisible: false,
      beacons: {},
      goalLocation: null,
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
      let markerPositions = {};
      if (Object.keys(this.playerData).length == 0) {
        return {};
      }
      let playerCurrentPosition = this.playerData[this.$store.state.auth.uid]
        .map_position;
      for (const [uuid, data] of Object.entries(this.players)) {
        let otherPlayerPosition = this.playerData[uuid].map_position;
        let distanceKm = maps_util.haversine_distance(
          this.goalLocation,
          otherPlayerPosition,
        );
        const username = data.username;
        let color = maps_util
          .colorForUuid(uuid, Object.keys(this.players))
          .substr(1);
        const playerPosition = {
          name: username,
          distanceKm: distanceKm,
          position: otherPlayerPosition,
          color: color,
        };
        markerPositions[uuid] = playerPosition;
      }
      return markerPositions;
    },
    playerUuid: function() {
      return this.$store.state.auth.uid;
    },
    lastPosition: function() {
      if (this.positionHistory.length == 0) {
        return null;
      }
      let position = this.positionHistory[this.positionHistory.length - 1];
      return position;
    },
    beaconMarkers: function() {
      let markers = {
        goal: {
          connected: false,
          radius_km: 0.5,
          in_range: false,
          position: this.goalLocation,
        },
      };
      return markers;
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

        this.playerData = roomState.race_data.player_data;
        this.finished = roomState.race_data.finished;
        this.goalLocation = roomState.options.race_goal_location;
        if (!this.initialMapPositionSet) {
          // The first time after loading the game we want to update the streetview position.
          // Afterwards the database is always secondary to streetview.
          this.initialMapPosition = this.playerData[
            this.$store.state.auth.uid
          ].map_position;
          this.positionHistory =
            this.playerData[this.$store.state.auth.uid].position_history ?? [];
          this.initialMapPositionSet = true;
        }


        this.timeLimit = roomState.options?.time_limit || null;
        this.deadlineTimestamp = roomState.race_data.deadline || null;

        if (
          this.deadlineTimestamp == null &&
          this.timeLimit != null &&
          this.isChief()
        ) {
          this.roomDbRef
            .child('race_data')
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
      const position = {
        lat: event.lat,
        lng: event.lng,
        time: new Date().getTime(),
      };
      if (!this.initialMapPositionSet) {
        console.log('Received position event before initial position sync.');
        return;
      }
      if (this.finished) {
        return;
      }
      this.positionHistory.push(position);
      let update_dict = {};
      update_dict[
        `race_data/player_data/${this.playerUuid}/map_position`
      ] = position;
      update_dict[
        `race_data/player_data/${this.playerUuid}/position_history`
      ] = this.positionHistory;
      this.roomDbRef.update(update_dict, error => {
        if (error) {
          console.log(error);
          this.$emit(
            'firebase_error',
            "Couldn't modify map position in database.",
          );
        }
      });
      console.error("END: ", new Date().getTime());
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
      for (const player_1 of Object.values(this.playerData)) {
          let distance_km = maps_util.haversine_distance(
            player_1.map_position,
            this.goalLocation,
          );
          if (distance_km <= 0.5) {
            this.finishGame(true);
            return true;
          }
      }
      return false;
    },
    finishGame: function(victory) {
      if (this.finished) {
        return;
      }
      this.roomDbRef
        .child('race_data')
        .update({ finished: true }, error => {
          if (error) {
            console.log(error);
            this.$emit(
              'firebase_error',
              "Couldn't modify 'finished' in database.",
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
      const kicked_player_uuid = event.player_uuid;
      if (Object.keys(this.players).length <= 2) {
        this.showDialog({
          title: "Can't kick when two or fewer players left",
          text: 'Create a new game instead',
        });
        return;
      }
      let updateDict = {};
      updateDict[`players/${kicked_player_uuid}`] = null;
      updateDict[`rendezvous_data/player_data/${kicked_player_uuid}`] = null;
      this.roomDbRef.update(updateDict);
    },
    ...mapMutations('persistentDialog', ['showPersistentDialog']),
    ...mapActions('persistentDialog', ['hidePersistentDialogAction']),
    ...mapMutations('dialog', ['showDialog']),
  },
};
</script>
