<template>
  <v-container class="fill-height" fluid>
    <v-row align="center" justify="center">
      <v-col cols="5">
        <v-card outlined>
          <v-card-text v-if="connected_players_names.length == 0">
            <div>No one has joined yet...</div>
          </v-card-text>
          <v-list dense v-if="connected_players_names.length > 0">
            <v-subheader>Connected Players</v-subheader>
            <v-list-item
              v-for="player_name in connected_players_names"
              :key="player_name"
            >
              <v-list-item-title>{{ player_name }}</v-list-item-title>
            </v-list-item>
          </v-list>
          <v-card-actions v-if="isChief()">
            <v-spacer />
            <v-btn v-on:click="startGame" color="primary">Start game</v-btn>
          </v-card-actions>
          <v-card-text v-if="!isChief()">
            <div>Waiting for {{ chiefName }} to start the game...</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
    <v-row align="center" justify="center">
      <v-col cols="2">
        <Dialog />
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// Lobby is used for waiting for other players to join.
// The chief of the room can start the game at any moment.
// In future, potential options (eg. only Poland) can be chosen here.
import { mapMutations } from 'vuex';
import * as firebase from 'firebase/app';
import 'firebase/database';
import Dialog from '@/components/Dialog';
import { roomObjectPath } from '@/database_utils.js';
import { trySignIn } from '@/store';

export default {
  name: 'Lobby',
  data: function() {
    return {
      connected_players: [],
      chief: null,

      playersDbRef: null,
      chiefDbRef: null,
      startedDbRef: null,
    };
  },
  methods: {
    isChief() {
      const uid = this.$store.state.uid;
      return uid === this.chief;
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
    cleanUpAndChangeView(location) {
      if (this.playersDbRef) {
        this.playersDbRef.off();
      }
      if (this.chiefDbRef) {
        this.chiefDbRef.off();
      }
      if (this.startedDbRef) {
        this.startedDbRef.off();
      }
      this.$router.push(location);
    },
    ...mapMutations(['showDialog']),
  },
  computed: {
    roomId: function() {
      return this.$route.params.roomId;
    },
    connected_players_names: function() {
      return Object.values(this.connected_players);
    },
    chiefName: function() {
      return this.connected_players[this.chief];
    },
  },
  created: function() {
    if (!this.roomId) {
      this.$router.push({ name: 'main' });
    }
    const uid = this.$store.state.uid;
    if (uid === null) {
      trySignIn();
      this.showDialog({
        title: 'Connection Error',
        text:
          'There was a problem with connection to Firebase :( Try again later.',
        confirmAction: function() {
          this.cleanUpAndChangeView({ name: 'main' });
        },
      });
      return;
    }

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
          confirmAction: function() {
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
            confirmAction: function() {
              this.cleanUpAndChangeView({ name: 'main' });
            },
          });
        }
        this.connected_players = Object.fromEntries(
          Object.entries(playersSnapshot.val())
            .filter(entry => entry[1].connected)
            .map(entry => [entry[0], entry[1].username]),
        );
      });
      this.chiefDbRef = roomRef.child('chief');
      this.chiefDbRef.on('value', chiefSnapshot => {
        if (!chiefSnapshot.exists()) {
          this.showDialog({
            title: 'The game was deleted',
            text: 'Try to join another one or create your own',
            confirmAction: function() {
              this.cleanUpAndChangeView({ name: 'main' });
            },
          });
        }
        this.chief = chiefSnapshot.val();
      });
      this.startedDbRef = roomRef.child('started');
      this.startedDbRef.on('value', startedSnapshot => {
        if (!startedSnapshot.exists()) {
          this.showDialog({
            title: 'The game was deleted',
            text: 'Try to join another one or create your own',
            confirmAction: function() {
              this.cleanUpAndChangeView({ name: 'main' });
            },
          });
        }
        if (startedSnapshot.val() === true) {
          this.cleanUpAndChangeView({
            name: 'game',
            params: { roomId: this.$route.params.roomId },
          });
        }
      });
    });
  },
  components: {
    Dialog,
  },
};
</script>
