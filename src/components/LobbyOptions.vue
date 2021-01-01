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
            v-model="selectedShapes"
            :items="availableShapes"
            :disabled="!isChief || shapesInputSyncing"
            label="Locations (empty = whole world)"
            multiple
            chips
            deletable-chips
            clearable
          ></v-autocomplete>
        </v-col>
      </v-row>
    </v-container>
  </v-card>
</template>

<script>
import * as firebase from 'firebase/app';
import _ from 'lodash';
import 'firebase/database';
import { roomObjectPath } from '@/firebase_utils.js';
import { mapActions } from 'vuex';

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
      selectedShapes: ['Europe', 'Yet another one'],
      availableShapes: [
        'Europe',
        'USA',
        'Poland',
        'Asia',
        'Another country',
        'Yet another one',
        'And some more',
      ],
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
    selectedShapes: function(newSelectedShapes, oldSelectedShapes) {
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
          this.selectedShapes = oldSelectedShapes;
        } else {
          this.$store.commit('gameGen/setNewShapes', { newSelectedShapes });
          this.regenerateGame({ roomPath: roomObjectPath(this.roomId) });
        }
        this.shapesInputSyncing = false;
        this.$nextTick(() => this.$refs.shapesInput.focus());
      });
    },
    // Once we learn we are a chief, trigger all the computations needed.
    isChief: function(newVal) {
      if (!newVal) {
        console.error('We lost "chief" status! This should never happen!');
      }
      // Stop watching for option changes.
      this.roomOptionsRef.off();
    },
  },
  methods: {
    watchOptionsChanges() {
      this.roomOptionsRef.on('value', optionsSnapshot => {
        let newOptions = optionsSnapshot.val();
        if (newOptions?.time_limit) {
          this.timeLimit = newOptions.time_limit;
        } else {
          this.timeLimit = '';
        }
        if (newOptions?.shapes) {
          this.selectedShapes = newOptions.shapes;
        } else {
          this.selectedShapes = [];
        }
      });
    },
    cleanUp() {
      if (this.roomOptionsRef) {
        this.roomOptionsRef.off();
      }
    },
    ...mapActions('gameGen', ['regenerateGame']),
  },
  mounted: function() {
    this.watchOptionsChanges();
  },
  unmounted: function() {
    this.cleanUp();
  },
};
</script>
