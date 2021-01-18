<template>
  <v-card outlined>
    <v-card-title>Game options</v-card-title>
    <v-container>
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
import * as firebase from 'firebase/app';
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
      timeLimit: '',
      selectedShapeNames: [],
      kmlUrl: '',
      availableShapeNames: [],
      timeLimitSyncing: false,
      shapesInputSyncing: false,
    };
  },
  computed: {
    roomOptionsRef: function() {
      return firebase
        .database()
        .ref(roomObjectPath(this.roomId))
        .child('options');
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
          console.log(error);
          this.$emit('firebase_error', "Couldn't modify time limit.");
          this.timeLimit = oldTimeLimit;
        }
        this.timeLimitSyncing = false;
        this.$nextTick(() => this.$refs.timeLimitInput.focus());
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
          console.log(error);
          this.$emit('firebase_error', "Couldn't modify locations.");
          this.selectedShapeNames = oldSelectedShapes;
        } else {
          this.setSelectedShapes({ shapes: newSelectedShapes });
          this.triggerGameRegeneration({
            roomPath: roomObjectPath(this.roomId),
          });
        }
        this.shapesInputSyncing = false;
        this.$nextTick(() => this.$refs.shapesInput.focus());
      });
    },
    kmlUrl: function(kmlUrlValue) {
      if (!this.isChief) {
        return;
      }
      this.roomOptionsRef.child('kml_url').set(kmlUrlValue, error => {
        if (error) {
          console.log(error);
          this.$emit('firebase_error', "Couldn't modify locations.");
        } else {
          this.setKmlUrl(kmlUrlValue);
          this.triggerGameRegeneration({
            roomPath: roomObjectPath(this.roomId),
          });
        }
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
      });
    },
    cleanUp() {
      if (this.roomOptionsRef) {
        this.roomOptionsRef.off();
      }
    },
    ...mapActions('gameGen', ['triggerGameRegeneration']),
    ...mapMutations('gameGen', ['setAvailableShapes', 'setSelectedShapes', 'setKmlUrl']),
  },
  mounted: function() {
    this.watchOptionsChanges();
  },
  unmounted: function() {
    this.cleanUp();
  },
};
</script>
