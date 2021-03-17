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
      <v-row>
        <v-col>
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
          <v-text-field
            ref="kmlUrlInput"
            v-model="kmlUrl"
            label="kml url (optional)"
            :disabled="!isChief"
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

export default {
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
  data: function() {
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
      },
      timeLimit: '',
      selectedShapeNames: [],
      kmlUrl: '',
      availableShapeNames: [],
      timeLimitSyncing: false,
      shapesInputSyncing: false,
      gameModeSyncing: false,
      showGameModePicker: false,
    };
  },
  computed: {
    roomOptionsRef: function() {
      return firebase
        .database()
        .ref(roomObjectPath(this.roomId))
        .child('options');
    },
    playersDbRef: function() {
      return firebase
        .database()
        .ref(roomObjectPath(this.roomId))
        .child('players');
    },
  },
  watch: {
    // Debounce causes the function to be fired at most once in the specified
    // time period.
    timeLimit: _.debounce(function(newTimeLimit, oldTimeLimit) {
      if (!this.isChief) {
        return;
      }
      if (this.timeLimitSyncing) {
        return;
      }
      this.timeLimitSyncing = true;
      this.roomOptionsRef.child('time_limit').set(newTimeLimit, error => {
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
    selectedShapeNames: function(newSelectedShapes, oldSelectedShapes) {
      if (!this.isChief) {
        return;
      }
      if (this.shapesInputSyncing) {
        return;
      }
      this.shapesInputSyncing = true;
      this.roomOptionsRef.child('shapes').set(newSelectedShapes, error => {
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
    kmlUrl: function(kmlUrlValue) {
      if (!this.isChief) {
        return;
      }
      this.roomOptionsRef.child('kml_url').set(kmlUrlValue, error => {
        if (error) {
          console.error(error);
          this.$emit('firebase_error', "Couldn't modify locations.");
        } else {
          this.setKmlUrl(kmlUrlValue);
          this.triggerGameRegeneration({
            roomPath: roomObjectPath(this.roomId),
          });
        }
      });
    },
    gameMode: function(gameModeValue, oldGameModeValue) {
      if (!this.isChief) {
        return;
      }
      if (this.gameModeSyncing) {
        return;
      }
      this.gameModeSyncing = true;
      this.roomOptionsRef.child('game_mode').set(gameModeValue, error => {
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
    isChief: function(newVal) {
      if (!newVal) {
        console.error('We lost "chief" status! This should never happen!');
      }
      // Stop watching for option changes.
      this.roomOptionsRef.off();
      this.loadAvailableShapes().then(() => {
        this.triggerGameRegeneration({ roomPath: roomObjectPath(this.roomId) });
      });
    },
  },
  methods: {
    loadAvailableShapes() {
      return fetchShapesIndex()
        .then(shapesIndex => {
          console.log('Fetched following shapes:', shapesIndex);
          this.setAvailableShapes({ shapes: shapesIndex });
          this.availableShapeNames = Object.keys(shapesIndex).sort();
        })
        .catch(error => {
          console.error('Failed to fetch shapes index. ', error);
        });
    },
    watchOptionsChanges() {
      this.roomOptionsRef.on('value', optionsSnapshot => {
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

        const newKmlUrl = newOptions?.kml_url || '';
        this.kmlUrl = newKmlUrl;
        this.setKmlUrl(newKmlUrl);

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
      'setKmlUrl',
      'setGameMode',
      'setPlayers',
    ]),
  },
  mounted: function() {
    this.watchOptionsChanges();
  },
  unmounted: function() {
    this.cleanUp();
  },
};
</script>
