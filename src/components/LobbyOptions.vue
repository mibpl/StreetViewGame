<template>
  <v-card outlined>
    <v-card-title>Game options</v-card-title>
    <v-container>
      <v-container v-if="showGameModePicker">
        <v-row>
          <v-col>
            <v-select
              ref="gameMode"
              v-model="gameMode"
              :hint="gameModeProperties[gameMode].hint"
              :items="Object.keys(gameModeProperties)"
              :disabled="!isChief || gameModeSyncing"
              item-text="mode"
              item-value="mode"
              label="Select game mode"
              persistent-hint
              return-object
              single-line
            ></v-select>
          </v-col>
        </v-row>
      </v-container>
      <v-row>
        <v-col>
          <v-text-field
            ref="timeLimitInput"
            v-model="timeLimit"
            :min="1"
            :max="3600"
            label="Round time limit in sec (empty = infinity)"
            type="number"
            :disabled="!isChief || timeLimitSyncing"
            clearable
          />
        </v-col>
      </v-row>
      <v-row v-if="gameMode == 'race'">
        <v-col>
        <p>Goal</p>
        <LocationPicker @on-click="goalLocationChange($event)" :pickingEnabled="isChief" v-bind:position="selectedGoalLocation" />
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <div
            v-if="
              gameMode == 'rendezvous' &&
              selectedShapeNames.length == 0 &&
              kmlPointCount == 0
            "
          >
            <span class="red--text">Warning:</span> for rendezvous to be
            winnable the starting locations of all players must be connected
            over streetview roads, but the location generation algorithm doesn't
            take this into account. (E.g. if one player is in the Americas and
            another in Asia, there is no way to win.) Select a location or
            provide a KML URL below to decrease the chance of being in an
            unwinnable game. You can use
            <a
              href="https://en.wikipedia.org/wiki/Coverage_of_Google_Street_View"
              >wikipedia</a
            >
            as a guide to good starting locations.
          </div>
          <v-autocomplete
            ref="shapesInput"
            v-model="selectedShapeNames"
            :items="availableShapeNames"
            :disabled="!isChief || shapesInputSyncing"
            label="Locations (empty = whole world)"
            multiple
            chips
            deletable-chips
            clearable
          ></v-autocomplete>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <input
            type="file"
            v-on:change="locationFileChange"
            :disabled="!isChief"
            accept="application/vnd.google-earth.kml+xml"
            class="input-file"
          />
          <div v-if="kmlPointCount > 0">
            {{ kmlPointCount }} locations loaded
          </div>
        </v-col>
      </v-row>
      <v-row>
        <v-col>
          <v-text-field
            ref="panoramaLookupPrecision"
            v-model="panoramaLookupPrecision"
            :min="100"
            :max="1000000"
            label="Panorama lookup precision (meters)"
            type="number"
            :disabled="!isChief || kmlPointCount == 0"
            clearable
          />
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>
import firebase from 'firebase/app';
import _ from 'lodash';
import 'firebase/database';
import { mapActions, mapMutations } from 'vuex';
import { roomObjectPath } from '@/firebase_utils.js';
import { fetchShapesIndex } from '@/game_gen/shapes_util.js';
import MarkerMap from './MarkerMap.vue';
import LocationPicker from './LocationPicker.vue';

export default {
  components: { MarkerMap, LocationPicker },
  name: 'LobbyOptions',
  props: {
    isChief: {
      type: Boolean,
      required: true,
    },
    roomId: {
      type: String,
      required: true,
    },
  },
  data: function () {
    return {
      gameMode: 'classic',
      gameModeProperties: {
        classic: {
          hint:
            'Players start at the same spot and must find their location on a map.',
        },
        rendezvous: {
          hint:
            'Players start at random locations and must rendezvous to a single location.',
        },
        race: {
          hint: 'Players race from A to  B.',
        },
      },
      timeLimit: '',
      selectedShapeNames: [],
      kmlPointCount: 0,
      availableShapeNames: [],
      timeLimitSyncing: false,
      shapesInputSyncing: false,
      gameModeSyncing: false,
      showGameModePicker: true,
      panoramaLookupPrecision: 100,
      selectedGoalLocation: null,
    };
  },
  computed: {
    roomOptionsRef: function () {
      return firebase
        .database()
        .ref(roomObjectPath(this.roomId))
        .child('options');
    },
    playersDbRef: function () {
      return firebase
        .database()
        .ref(roomObjectPath(this.roomId))
        .child('players');
    },
  },
  watch: {
    // Debounce causes the function to be fired at most once in the specified
    // time period.
    timeLimit: _.debounce(function (newTimeLimit, oldTimeLimit) {
      if (!this.isChief) {
        return;
      }
      if (this.timeLimitSyncing) {
        return;
      }
      this.timeLimitSyncing = true;
      this.roomOptionsRef.child('time_limit').set(newTimeLimit, (error) => {
        if (error) {
          console.error(error);
          this.$emit('firebase_error', "Couldn't modify time limit.");
          this.timeLimit = oldTimeLimit;
        }
        this.$nextTick(() => {
          this.timeLimitSyncing = false;
          this.$refs.timeLimitInput.focus();
        });
      });
    }, 500),
    panoramaLookupPrecision: function (newValue) {
      if (!this.isChief) {
        return;
      }
      this.setPanoramaLookupPrecision(newValue);
      this.panoramaLookupPrecision = newValue;
    },
    selectedShapeNames: function (newSelectedShapes, oldSelectedShapes) {
      if (!this.isChief) {
        return;
      }
      if (this.shapesInputSyncing) {
        return;
      }
      this.shapesInputSyncing = true;
      this.roomOptionsRef.child('shapes').set(newSelectedShapes, (error) => {
        if (error) {
          console.error(error);
          this.$emit('firebase_error', "Couldn't modify locations.");
          this.selectedShapeNames = oldSelectedShapes;
        } else {
          this.setSelectedShapes({ shapes: newSelectedShapes });
          this.triggerGameRegeneration({
            roomPath: roomObjectPath(this.roomId),
          });
        }
        this.$nextTick(() => {
          this.shapesInputSyncing = false;
          this.$refs.shapesInput.focus();
        });
      });
    },
    gameMode: function (gameModeValue, oldGameModeValue) {
      if (!this.isChief) {
        return;
      }
      if (this.gameModeSyncing) {
        return;
      }
      this.gameModeSyncing = true;
      this.roomOptionsRef.child('game_mode').set(gameModeValue, (error) => {
        if (error) {
          console.error(error);
          this.$emit('firebase_error', "Couldn't modify game mode.");
          this.gameMode = oldGameModeValue;
        } else {
          this.setGameMode(gameModeValue);
          this.triggerGameRegeneration({
            roomPath: roomObjectPath(this.roomId),
          });
        }
        this.$nextTick(() => {
          this.gameModeSyncing = false;
          this.$refs.gameMode.focus();
        });
      });
    },
    // Once we learn we are a chief, trigger all the computations needed.
    isChief: function (newVal) {
      if (!newVal) {
        console.error('We lost "chief" status! This should never happen!');
        return;
      }
      // Stop watching for option changes.
      this.roomOptionsRef.off();
      this.loadAvailableShapes().then(() => {
        this.triggerGameRegeneration({ roomPath: roomObjectPath(this.roomId) });
      });
    },
  },
  methods: {
    goalLocationChange(data) {
      this.roomOptionsRef.child('race_goal_location').set(data, (error) => {
        console.log("Failed to save location goal", error);
      });
    },
    locationFileChange(data) {
      if (!this.isChief) {
        return;
      }

      const files = data.target.files;
      if (files.length == 1) {
        files[0].text().then((data) => {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(data, 'text/xml');

          const result = xmlDoc.evaluate(
            "//*[local-name()='coordinates']/text()",
            xmlDoc,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null,
          );
          let points = [];
          for (var i = 0; i < result.snapshotLength; i++) {
            const item = result.snapshotItem(i);
            const coordsStr = item.textContent.trim().split(',');
            const x = parseFloat(coordsStr[0]);
            const y = parseFloat(coordsStr[1]);
            points.push([x, y]);
          }

          this.kmlPointCount = points.length;
          this.setKmlPoints(points);
          this.triggerGameRegeneration({
            roomPath: roomObjectPath(this.roomId),
          });
        });
      }
    },
    loadAvailableShapes() {
      return fetchShapesIndex()
        .then((shapesIndex) => {
          console.log('Fetched following shapes:', shapesIndex);
          this.setAvailableShapes({ shapes: shapesIndex });
          this.availableShapeNames = Object.keys(shapesIndex).sort();
        })
        .catch((error) => {
          console.error('Failed to fetch shapes index. ', error);
        });
    },
    watchOptionsChanges() {
      this.roomOptionsRef.on('value', (optionsSnapshot) => {
        const newOptions = optionsSnapshot.val();

        const newTimeLimit = newOptions?.time_limit || '';
        this.timeLimit = newTimeLimit;

        const newShapes = newOptions?.shapes || [];
        // All selected shapes have to be in the available ones, otherwise
        // they will be ignored.
        // Probably a cleaner way would be to use something else than
        // v-autocomplete object on client side.
        this.availableShapeNames = newShapes;
        this.selectedShapeNames = newShapes;
        this.setSelectedShapes({ shapes: newShapes });

        this.selectedGoalLocation = newOptions?.race_goal_location;

        console.log("option change", newOptions);

        const newGameMode = newOptions?.game_mode || '';
        this.gameMode = newGameMode;
        this.setGameMode(newGameMode);
      });
    },
    cleanUp() {
      if (this.roomOptionsRef) {
        this.roomOptionsRef.off();
      }
      if (this.playersDbRef) {
        this.playersDbRef.off();
      }
    },
    ...mapActions('gameGen', ['triggerGameRegeneration']),
    ...mapMutations('gameGen', [
      'setAvailableShapes',
      'setSelectedShapes',
      'setKmlPoints',
      'setGameMode',
      'setPlayers',
      'setPanoramaLookupPrecision',
    ]),
  },
  mounted: function () {
    this.watchOptionsChanges();
  },
  unmounted: function () {
    this.cleanUp();
  },
};
</script>
