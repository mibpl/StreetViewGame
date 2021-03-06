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
            <v-btn
              id="play_btn"
              color="primary"
              :loading="joiningGame"
              v-on:click="joinGame"
              class="white--text"
            >
              Play!
            </v-btn>
          </v-col>
        </v-row>
        <v-row align="center">
          <v-col class="text-center">
            <v-btn
              v-on:click="createRoom"
              id="create_room_btn"
              :loading="creatingRoom"
              color="primary"
              class="white--text"
            >
              Create a new room
            </v-btn>
          </v-col>
        </v-row>
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col cols="2">
        <Dialog />
      </v-col>
      <v-col cols="2">
        <PersistentDialog />
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col>
        <v-dialog v-model="creatingRoom" hide-overlay persistent width="300">
          <v-card color="primary" dark>
            <v-card-text>
              Creating a room...
              <v-progress-linear indeterminate color="white" class="mb-0">
              </v-progress-linear>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col>
        <v-dialog v-model="joiningGame" hide-overlay persistent width="300">
          <v-card color="primary" dark>
            <v-card-text>
              Joining a room...
              <v-progress-linear indeterminate color="white" class="mb-0">
              </v-progress-linear>
            </v-card-text>
          </v-card>
        </v-dialog>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// Main view is used as a landing page, for both when:
//  * root page is opened
//  * join link is clicked
// In the latter situation, also the Play button becomes active.
import Dialog from '@/components/Dialog';
import PersistentDialog from '@/components/PersistentDialog';
import firebase from 'firebase/app';
import 'firebase/database';
import { hri } from 'human-readable-ids';
import { mapMutations } from 'vuex';
import { roomObjectPath, signInGuard } from '@/firebase_utils.js';

export default {
  name: 'Main',
  components: {
    Dialog,
    PersistentDialog,
  },
  data: function() {
    return {
      creatingRoom: false,
      joiningGame: false,
    };
  },
  computed: {
    username: {
      get() {
        return this.$store.state.auth.username;
      },
      set(value) {
        this.$store.commit('auth/setUsername', value);
      },
    },
  },
  methods: {
    getUsername: function() {
      const username = this.username;
      if (!username) {
        this.showDialog({
          title: 'Username required',
          text: 'Please set username first.',
        });
        return null;
      }
      return username;
    },
    createRoom: async function() {
      this.creatingRoom = true;
      const uid = this.$store.state.auth.uid;
      const username = this.getUsername();
      if (!username) {
        return;
      }
      let roomId = hri.random();
      let roomObjectName = roomObjectPath(roomId);

      let roomRef = firebase.database().ref(roomObjectName);
      let roomObject = {
        chief: uid,
        started: false,
        finished: false,
        players: {},
        current_round: 0,
        options: {
          game_mode: "classic",
        },
      };
      roomObject.players[uid] = {
        username: username,
      };
      roomRef.set(roomObject, error => {
        if (error) {
          this.creatingRoom = false;
          console.log(error);
          this.showDialog({
            title: 'Firebase connection error',
            text:
              'There was an error creating the room. Please try again later.',
          });
        } else {
          this.$router.push({ name: 'lobby', params: { roomId: roomId } });
        }
      });
    },
    joinGame: function() {
      const uid = this.$store.state.auth.uid;
      const username = this.getUsername();
      if (!username) {
        return;
      }
      const roomId = this.$route.params.roomId;
      if (!roomId) {
        this.showDialog({
          title: 'Error',
          text: 'Redirecting to main page.',
          confirm_action: () => {
            this.$router.push({ name: 'main' });
          },
        });
      }

      this.joiningGame = true;
      let roomRef = firebase.database().ref(roomObjectPath(roomId));
      roomRef.once('value').then(roomSnapshot => {
        if (!roomSnapshot.exists()) {
          this.joiningGame = false;
          this.showDialog({
            title: "Room doesn't exist",
            text:
              "Room you are trying to join doesn't exist. " +
              'Use correct link or create a new room.',
            confirmAction: function() {
              this.$router.push({ name: 'main' });
            },
          });
          return;
        }
        if (roomSnapshot.val().started) {
          this.joiningGame = false;
          this.showDialog({
            title: 'Game has already started',
            text:
              'Game you are trying to join has been already started. ' +
              'Use a different link or create a new room.',
            confirmAction: function() {
              this.$router.push({ name: 'main' });
            },
          });
          return;
        }

        roomRef.child(`players/${uid}`).set(
          {
            username: username,
          },
          error => {
            if (error) {
              this.joiningGame = false;
              console.log(error);
              this.showDialog({
                title: 'Firebase connection error',
                text:
                  'There was an error joining the room. Please try again later.',
              });
            } else {
              this.$router.push({ name: 'lobby', params: { roomId: roomId } });
            }
          },
        );
      });
    },
    ...mapMutations('persistentDialog', [
      'showPersistentDialog',
      'hidePersistentDialog',
    ]),
    ...mapMutations('dialog', ['showDialog']),
  },
  created: function() {
    this.showPersistentDialog({
      text: 'Connecting...',
    });
    signInGuard(this.$store)
      .then(() => {
        this.hidePersistentDialog();
      })
      .catch(error => {
        console.log('Error getting user UID:', error);
        this.showPersistentDialog({
          text: 'Unable to connect to Firebase :/ Try refreshing later.',
        });
      });
  },
};
</script>
