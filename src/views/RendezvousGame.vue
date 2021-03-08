<template>
  <div id="game-view-container">
    <v-overlay :value="finished" id="win-overlay">
      <v-card light height="100%">
        <v-card-title>
          Results
        </v-card-title>
        <v-container>
          <RendezvousResults
            v-bind:players="players"
            v-bind:player_data="playerData"
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
    <PlayerList
      @on-kick-player="kickPlayer($event)"
      v-bind:playerGuessStatus="players"
      v-bind:isChief="isChief()"
    />
    <Streets
      v-bind:initialMapPosition="initialMapPosition"
      v-on:position_changed="positionChanged($event)"
      v-bind:jumpButtonsEnabled="true"
    />
    <div id="map-overlay">
      <MarkerMap @on-click="teleport($event)" v-bind:guessingEnabled="false" />
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
import { roomObjectPath, signInGuard, roomGuard } from '@/firebase_utils.js';
import { mapMutations } from 'vuex';
import maps_util from '../maps_util';

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
  },
  data: function() {
    return {
      initialMapPosition: { lat: 37.75598, lng: -122.41231 },
      initialMapPositionSet: false,
      finished: false,
      roomState: {},
      players: {},
      playerData: {},
      currentChief: '',
      timeLimit: null,
      teleportEnabled: false,
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

        if (!this.players) {
          this.players = [];
        }
        this.players = roomState.players;
        if (!this.finished && this.isChief()) {
          this.updateFinished();
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
    updateFinished: function() {
      if (this.finished) {
        return;
      }
      if (this.playerData == null) {
        return;
      }
      if (Object.keys(this.playerData).length <= 1) return false;
      let max_distance_km = 0;
      for (const player_1 of Object.values(this.playerData)) {
        for (const player_2 of Object.values(this.playerData)) {
          let distance_km = maps_util.haversine_distance(
            player_1.map_position,
            player_2.map_position,
          );
          console.log('Distance:', player_1, player_2, distance_km);
          max_distance_km = Math.max(max_distance_km, distance_km);
        }
      }
      if (max_distance_km > 0.01) {
        return;
      }
      // Within 10m.
      this.roomDbRef
        .child('rendezvous_data')
        .child('finished')
        .set(true, error => {
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
