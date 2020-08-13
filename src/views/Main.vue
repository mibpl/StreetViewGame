<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="5">
        <v-card outlined>
          <v-card-text>
            <v-form>
              <v-text-field
                v-model="username"
                label="Username"
                name="username"
                prepend-icon="mdi-account"
                type="text"
              ></v-text-field>
            </v-form>
          </v-card-text>
        </v-card>
        <v-row v-if="$route.params.roomId" align="center">
          <v-col class="text-center">
            <v-btn id="play_btn" color="primary">Play!</v-btn>
          </v-col>
        </v-row>
        <v-row align="center">
          <v-col class="text-center">
            <v-btn v-on:click="createRoom" id="create_room_btn" color="primary">
              Create a new room
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col cols="2">
        <ErrorDialog
          :show="errorDialog.show"
          :title="errorDialog.title"
          :message="errorDialog.message"
          v-on:close-dialog="errorDialog.show = false"
        />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// Main view is used as a landing page, for both when:
//  * root page is opened
//  * join link is clicked
// In the latter situation, also the Play button becomes active.
import ErrorDialog from '@/components/ErrorDialog';
import * as firebase from 'firebase/app';
import 'firebase/database';
import { trySignIn } from '@/store';
import { hri } from 'human-readable-ids';
import { aChooseRandomStreetView } from '@/util.js';

export default {
  name: 'Main',
  components: {
    ErrorDialog,
  },
  data: function() {
    return {
      errorDialog: {
        show: false,
        title: '',
        message: '',
      },
    };
  },
  computed: {
    username: {
      get() {
        return this.$store.state.username;
      },
      set(value) {
        this.$store.commit('setUsername', value);
      },
    },
  },
  methods: {
    createRoom: async function() {
      const uid = this.$store.state.uid;
      if (uid === null) {
        trySignIn();
        this.errorDialog = {
          show: true,
          title: 'Connection Error',
          message:
            'There was a problem with connection to Firebase :( Try again later.',
        };
        return;
      }
      const username = this.username;
      if (!username) {
        this.errorDialog = {
          show: true,
          title: 'Username required',
          message: 'Please set username first.',
        };
        return;
      }
      let roomId = hri.random();
      let roomObjectName = process.env.VUE_APP_DB_PREFIX + roomId;

      const rounds = {};
      for (let i=0; i<5; i++) {
        rounds[i] = {
          map_position: (await aChooseRandomStreetView()).toJSON(),
        }
      }

      // Yes, this might potentially result in having a room with nothing else
      // but just this disconnected player. Pretty unlikely and no big deal.
      let playerConnectedRef = firebase
        .database()
        .ref(`${roomObjectName}/players/${uid}/connected`);
      playerConnectedRef.onDisconnect().set(false);

      let roomRef = firebase.database().ref(roomObjectName);
      let roomObject = {
        chief: uid,
        started: false,
        finished: false,
        players: {},
        current_round: 0,
        rounds: rounds,
      };
      roomObject.players[uid] = {
        username: username,
        connected: true,
      };
      roomRef.set(roomObject, error => {
        if (error) {
          console.log(error);
          this.errorDialog = {
            show: true,
            title: 'Firebase connection error',
            message:
              'There was an error creating the room. Please try again later.',
          };
        } else {
          this.$router.push({ name: 'lobby', params: { roomId: roomId } });
        }
      });
    },
  },
};
</script>
