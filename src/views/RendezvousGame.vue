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
          v-bind:victory="victory"
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
      v-bind:triggerTeleportToPanoramaId="triggerTeleportToPanoramaId"
      v-on:position_changed="positionChanged($event)"
      v-on:pano_changed="panoChanged($event)"
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
        @on-click="teleport($event)"
        @on-beacon-click="teleportToBeacon($event)"
      />
    </div>
    <v-btn
      id="beacon-button"
      fab
      elevation="0"
      color="primary"
      @click="addBeacon()"
    >
      <v-icon large>mdi-radio-tower</v-icon>
    </v-btn>
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
import destination from '@turf/destination';

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
      // See Streets.vue panorama initialization for why this is empty.
      initialMapPosition: {},
      initialMapPositionSet: false,
      triggerTeleportToPanoramaId: {},
      finished: false,
      victory: false,
      roomState: {},
      players: {},
      playerData: {},
      positionHistory: [],
      currentChief: '',
      timeLimit: null,
      deadlineTimestamp: null,
      deadlineTimerSet: null,
      instructionsVisible: false,
      giveUpVisible: false,
      beacons: {},
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
          playerCurrentPosition,
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
      let markers = {};
      for (const [beacon_uuid, beacon] of Object.entries(this.beacons)) {
        markers[beacon_uuid] = {
          position: beacon.position,
          radius_km: beacon.radius_km,
          connected: beacon_uuid in this.playerBeacons,
          in_range:
            this.lastPosition != null &&
            maps_util.haversine_distance(this.lastPosition, beacon.position) <
              beacon.radius_km,
          followups: beacon.followups,
        };
      }
      return markers;
    },
    debugEnabled: function() {
      return (
        this.players[this.$store.state.auth.uid].username.search('_debug') != -1
      );
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
        const beacons = roomState.rendezvous_data.beacons ?? {};
        if (!_.isEqual(beacons, this.beacons ?? {})) {
          // We don't modify the existing beacons if the keys are the same
          // (a key should identify a beacon uniquely, and beacon details don't
          // change). This prevents constant and ugly marker map UI refreshes.
          this.beacons = beacons;
          this.checkForNearbyBeacons();
        }
        this.finished = roomState.rendezvous_data.finished;
        this.victory = roomState.rendezvous_data.victory;
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

        this.playerBeacons =
          this.playerData[this.$store.state.auth.uid].beacons ?? {};
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
    panoChanged: function(event) {
      this.panoramaId = event;
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
        `rendezvous_data/player_data/${this.playerUuid}/map_position`
      ] = position;
      update_dict[
        `rendezvous_data/player_data/${this.playerUuid}/position_history`
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
      this.checkForNearbyBeacons();
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
      if (max_distance_km > 0.05) {
        return false;
      }
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
      if (!this.debugEnabled) {
        return;
      }
      console.log('Teleport to ', newPosition);
      const newStreetviewPosition = await maps_util.getClosestPanorama(
        newPosition,
        50,
      );
      console.log('Found: ', newStreetviewPosition);
      if (newStreetviewPosition != null) {
        this.initialMapPosition = newStreetviewPosition;
      }
    },
    async teleportToBeacon(beaconId) {
      this.triggerTeleportToPanoramaId = {
        panoramaId: this.beacons[beaconId].panoramaId,
      };
      this.showToast({
        text: 'Teleporting to beacon',
      });
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
    addBeacon() {
      // TODO: resolve other todos.
      // TODO: error handling everywhere
      if (this.finished) {
        return;
      }
      if (this?.panoramaId == null) {
        this.showDialog({
          title: 'Missing panorama id',
          text:
            "We don't have a panorama id yet, moving to a different spot " +
            'should fix it.',
        });
      }
      let beacon_uuid = null;
      let parent_uuid = null;
      if (Object.keys(this.beacons).length > 0) {
        for (const [existing_uuid, beacon] of Object.entries(this.beacons)) {
          for (const [followup_uuid, followup] of Object.entries(
            beacon.followups ?? {},
          )) {
            if (
              maps_util.haversine_distance(
                this.lastPosition,
                followup.position,
              ) < 0.05 &&
              !(followup.used ?? false)
            ) {
              beacon_uuid = followup_uuid;
              parent_uuid = existing_uuid;
              break;
            }
          }
          if (beacon_uuid != null) {
            break;
          }
        }
        if (beacon_uuid == null) {
          this.showDialog({
            title: "Can't set up a beacon here",
            text:
              'A beacon already exists on the map. Additional beacons can ' +
              'only be placed in compatible locations revealed by the first ' +
              'beacon (see marker map).',
          });
          return;
        }
      } else {
        beacon_uuid = uuidv4();
      }
      let distances_km = [];
      let founders = [];
      for (const [player_id, player] of Object.entries(this.playerData)) {
        let distance_km = maps_util.haversine_distance(
          this.lastPosition,
          player.map_position,
        );
        if (distance_km < 0.05) {
          founders.push(this.players[player_id].username);
        } else {
          distances_km.push(distance_km);
        }
      }
      if (founders.length < 2) {
        this.showDialog({
          title: "Can't set up beacon without help",
          text:
            'To set up a beacon you must have help from another ' +
            'person (within 50m).',
        });
        return;
      }
      // Default radius, in case everyone's here.
      let radius_km = 100;
      if (distances_km.length > 0) {
        distances_km.sort((a, b) => a - b);
        radius_km = distances_km[Math.floor(distances_km.length / 2)];
      }
      let update_dict = {};
      update_dict[`rendezvous_data/beacons/${beacon_uuid}`] = {
        position: { lat: this.lastPosition.lat, lng: this.lastPosition.lng },
        panoramaId: this.panoramaId,
        founders: founders,
        creation_time: new Date().getTime(),
        radius_km: radius_km,
      };
      if (parent_uuid != null) {
        update_dict[
          `rendezvous_data/beacons/${parent_uuid}/followups/${beacon_uuid}/used`
        ] = true;
      }
      this.roomDbRef.update(update_dict);
      this.checkForNearbyBeacons();
      let beacon_positions = [this.lastPosition];
      for (const beacon of Object.values(this.beacons)) {
        beacon_positions.push(beacon.position);
      }
      this.generateCandidateBeacons(this.lastPosition, radius_km, beacon_positions, followup => {
        const followup_uuid = uuidv4();
        let update_dict = {};
        update_dict[
          `rendezvous_data/beacons/${beacon_uuid}/followups/${followup_uuid}`
        ] = {
          position: { lat: followup.lat, lng: followup.lng },
        };
        this.roomDbRef.update(update_dict);
      });
    },
    checkForNearbyBeacons() {
      if (this.positionHistory.length == 0) {
        return;
      }
      let position = this.positionHistory[this.positionHistory.length - 1];
      let update_dict = {};
      for (const [beacon_uuid, beacon] of Object.entries(this.beacons)) {
        if (
          !(beacon_uuid in this.playerBeacons) &&
          maps_util.haversine_distance(position, beacon.position) < 0.05
        ) {
          update_dict[
            `rendezvous_data/player_data/${this.playerUuid}/beacons/${beacon_uuid}`
          ] = true;
        }
      }
      this.roomDbRef.update(update_dict);
    },
    normalizeLng(val) {
      while (val < -180) {
        val += 360;
      }
      while (val > 180) {
        val -= 360;
      }
      return val;
    },
    normalizeLat(val) {
      if (val < -90) {
        return -90;
      }
      if (val > 90) {
        return 90;
      }
      return val;
    },
    async generateCandidateBeacons(position, radius_km, beacon_positions, cb) {
      // We don't allow candidates to spawn too close to a repelling position.
      let repelling_positions = beacon_positions;
      for (let i = 0; i < 5; i++) {
        const right = destination([position.lng, position.lat], radius_km, 90)
          .geometry.coordinates[0];
        const left = destination([position.lng, position.lat], radius_km, -90)
          .geometry.coordinates[0];
        const top = destination([position.lng, position.lat], radius_km, 0)
          .geometry.coordinates[1];
        const bottom = destination([position.lng, position.lat], radius_km, 180)
          .geometry.coordinates[1];
        let points = randomPoint(10, {
          bbox: [left, bottom, right, top],
        });
        // We do exponentially smaller radiuses, from each radius we take at
        // most 5 points.
        let points_emitted_at_radius = 0;
        for (const point of points.features) {
          const latlng = {
            lat: point.geometry.coordinates[1],
            lng: point.geometry.coordinates[0],
          };
          let actualPosition = await maps_util.getClosestPanorama(latlng);
          if (!actualPosition) {
            continue;
          }
          if (maps_util.haversine_distance(actualPosition, position) < 1) {
            continue;
          }
          let too_close = false;
          for (const emitted_point of repelling_positions) {
            if (maps_util.haversine_distance(actualPosition, emitted_point) < 1) {
              too_close = true;
              break;
            }
          }
          if (too_close) {
            continue;
          }
          repelling_positions.push(actualPosition);
          points_emitted_at_radius += 1;
          cb(actualPosition);
          if (points_emitted_at_radius >= 5) {
            break;
          }
        }
        radius_km /= 2;
        // At small radiuses most points will be nearby, so we stop instead.
        if (radius_km <= 2) {
          break;
        }
      }
    },
    ...mapMutations('persistentDialog', ['showPersistentDialog']),
    ...mapActions('persistentDialog', ['hidePersistentDialogAction']),
    ...mapActions('toast', ['showToast']),
    ...mapMutations('dialog', ['showDialog']),
  },
};
</script>
