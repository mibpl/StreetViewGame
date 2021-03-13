<template>
  <v-container fluid>
    <v-row justify="center">
      <v-col>
        <v-spacer></v-spacer>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col cols="5">
        <v-card outlined align="center" justify="center">
          <v-card-text>
            <div>
              Join link: {{ joinLink }}
              <v-btn icon v-clipboard:copy="joinLink">
                <v-icon>mdi-content-copy</v-icon>
              </v-btn>
            </div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col cols="5">
        <LobbyConnectedPlayers
          v-bind:connectedPlayersNames="connectedPlayersNames"
        />
      </v-col>
      <v-col cols="5">
        <LobbyOptions
          :isChief="isChief"
          :roomId="roomId"
          v-on:firebase_error="firebaseErrorDialog"
        />
      </v-col>
    </v-row>
    <v-row justify="center">
      <v-col class="text-center">
        <v-btn
          v-if="isChief"
          v-on:click="tryStartingGame"
          :loading="startingGame"
          color="primary"
          class="white--text"
        >
          Start game
        </v-btn>
        <p v-if="!isChief && chiefName" class="font-italic">
          Waiting for {{ chiefName }} to start the game...
        </p>
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col>
        <Dialog />
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col>
        <PersistentDialog />
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col>
        <v-dialog v-model="startingGame" hide-overlay persistent width="300">
          <v-card color="primary" dark>
            <v-card-text>
              Generating the game...
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
// Lobby is used for waiting for other players to join.
// The chief of the room can start the game at any moment.
// In future, potential options (eg. only Poland) can be chosen here.
import LobbyConnectedPlayers from '@/components/LobbyConnectedPlayers.vue';
import LobbyOptions from '@/components/LobbyOptions.vue';
import { mapActions, mapMutations } from 'vuex';
import firebase from 'firebase/app';
import 'firebase/database';
import Dialog from '@/components/Dialog';
import PersistentDialog from '@/components/PersistentDialog';
import { roomObjectPath, signInGuard, roomGuard } from '@/firebase_utils.js';

export default {
  name: 'Lobby',
  data: function() {
    return {
      connected_players: [],
      chief: null,

      playersDbRef: null,
      chiefDbRef: null,
      startedDbRef: null,

      startingGame: false,
      forceRegenerationOnStartGame: false,
    };
  },
  methods: {
    tryStartingGame() {
      if (this.forceRegenerationOnStartGame) {
        this.triggerGameRegeneration({ roomPath: roomObjectPath(this.roomId) });
      }
      this.startingGame = true;
      this.ensureGameGeneratedAndStart();
    },
    startGame() {
      if (!this.startedDbRef) {
        console.log('Trying to start game before "created"');
      }
      this.startedDbRef.set(true, error => {
        if (error) {
          console.log(error);
          this.showDialog({
            title: 'Connection Error',
            text:
              'There was a problem with connection to Firebase :( ' +
              'Try again later.',
          });
          return;
        }
      });
    },
    cleanUp() {
      if (this.playersDbRef) {
        this.playersDbRef.off();
      }
      if (this.chiefDbRef) {
        this.chiefDbRef.off();
      }
      if (this.startedDbRef) {
        this.startedDbRef.off();
      }
    },
    cleanUpAndChangeView(location) {
      this.cleanUp();
      this.$router.push(location);
    },
    firebaseErrorDialog(errorText) {
      this.showDialog({
        title: 'Firebase connection error',
        text: errorText + ' Please try again later.',
      });
    },
    refreshPage() {
      if (!this.roomId) {
        this.$router.push({ name: 'main' });
      }
      const uid = this.$store.state.auth.uid;

      const roomRef = firebase.database().ref(roomObjectPath(this.roomId));
      // Try getting room data from Firebase.
      roomRef.once('value').then(roomSnapshot => {
        // The room doesn't exist. Inform user and redirect to main.
        if (!roomSnapshot.exists()) {
          this.showDialog({
            title: "Room doesn't exist",
            text:
              "Room you are trying to join doesn't exist. " +
              'Use correct link or create a new room.',
            confirmAction: () => {
              this.cleanUpAndChangeView({ name: 'main' });
            },
          });
          return;
        }
        // User has not yet joined. Redirect to relevant join page.
        if (!roomSnapshot.child(`players/${uid}`).exists()) {
          this.cleanUpAndChangeView({
            name: 'join',
            params: { roomId: this.roomId },
          });
          return;
        }

        // It seems the user actually is in a lobby for this game. Let's display
        // the relevant info.
        this.playersDbRef = roomRef.child('players');
        this.playersDbRef.on('value', playersSnapshot => {
          if (!playersSnapshot.exists()) {
            this.showDialog({
              title: 'The game was deleted',
              text: 'Try to join another one or create your own',
              confirmAction: () => {
                this.cleanUpAndChangeView({ name: 'main' });
              },
            });
          }
          this.connected_players = Object.fromEntries(
            Object.entries(playersSnapshot.val()).map(entry => [
              entry[0],
              entry[1].username,
            ]),
          );
        });
        this.chiefDbRef = roomRef.child('chief');
        this.chiefDbRef.on('value', chiefSnapshot => {
          if (!chiefSnapshot.exists()) {
            this.showDialog({
              title: 'The game was deleted',
              text: 'Try to join another one or create your own',
              confirmAction: () => {
                this.cleanUpAndChangeView({ name: 'main' });
              },
            });
          }
          this.chief = chiefSnapshot.val();
        });
        let gameModeDbRef = roomRef.child('options').child('game_mode');
        this.startedDbRef = roomRef.child('started');
        this.startedDbRef.on('value', startedSnapshot => {
          if (!startedSnapshot.exists()) {
            this.showDialog({
              title: 'The game was deleted',
              text: 'Try to join another one or create your own',
              confirmAction: () => {
                this.cleanUpAndChangeView({ name: 'main' });
              },
            });
          }
          if (startedSnapshot.val() === true) {
            gameModeDbRef.once('value').then(gameMode => {
              if (gameMode.val() != 'classic' && gameMode.val() != 'rendezvous') {
                this.showDialog({
                  title: `Game mode ${gameMode.val()} unknown`,
                  text:
                    "Room you are trying to access doesn't have a game mode set. " +
                    'Create a new room.',
                  confirmAction: () => {
                    this.cleanUpAndChangeView({ name: 'main' });
                  },
                });
              }
              this.cleanUpAndChangeView({
                name: gameMode.val(),
                params: { roomId: this.$route.params.roomId },
              });
            });
          }
        });
      });
    },
    async ensureGameGeneratedAndStart() {
      this.waitToFinishGeneration()
        .then(() => {
          this.startGame();
        })
        .catch(error => {
          this.startingGame = false;
          this.forceRegenerationOnStartGame = true;
          this.showDialog({
            title: "Couldn't generate game",
            text: 'Please try again later. ' + error,
          });
        });
    },
    ...mapActions('gameGen', [
      'triggerGameRegeneration',
      'waitToFinishGeneration',
    ]),
    ...mapMutations('persistentDialog', [
      'showPersistentDialog',
      'hidePersistentDialog',
    ]),
    ...mapMutations('dialog', ['showDialog']),
  },
  computed: {
    isChief: function() {
      const uid = this.$store.state.auth.uid;
      return this.chief !== null && uid === this.chief;
    },
    roomId: function() {
      return this.$route.params.roomId;
    },
    connectedPlayersNames: function() {
      return Object.values(this.connected_players);
    },
    chiefName: function() {
      return this.connected_players[this.chief];
    },
    joinLink: function() {
      return `${window.location.origin}/join/${this.roomId}`;
    },
  },
  created: function() {
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
        const roomId = this.$route.params.roomId;
        return roomGuard(roomId, uid);
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
            confirmAction: () => {
              this.cleanUpAndChangeView({ name: 'main' });
            },
          });
        } else {
          // User is not in the room. Redirect them to the join link.
          this.cleanUpAndChangeView({
            name: 'join',
            params: { roomId: this.$route.params.roomId },
          });
        }
      });
  },
  watch: {
    // We learn if we are Chief only after getting all the data back from
    // Firebase, we don't know this eg. on mount.
    // At the same time, it should never happen that we were a chief and
    // suddenly lost that function.
    isChief: function(newVal) {
      if (!newVal) {
        console.error('We lost "chief" status! This should never happen!');
      }
      this.triggerGameRegeneration({ roomPath: roomObjectPath(this.roomId) });
    },
  },
  unmounted: function() {
    this.cleanUp();
  },
  components: {
    Dialog,
    LobbyConnectedPlayers,
    LobbyOptions,
    PersistentDialog,
  },
};
</script>
