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
          :show="showErrorDialog"
          v-on:close-dialog="showErrorDialog = false"
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
import { trySignIn } from '@/store';
import { hri } from 'human-readable-ids';

export default {
  name: 'Main',
  components: {
    ErrorDialog,
  },
  data: function() {
    return {
      showErrorDialog: false,
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
    createRoom: function() {
      const uid = this.$store.state.uid;
      if (uid === null) {
        trySignIn();
        this.showErrorDialog = true;
        return;
      }
      let roomId = hri.random();
      let roomRef = firebase
        .database()
        .ref(process.env.VUE_APP_DB_PREFIX + roomId);
      roomRef.set({ chief: uid, started: false, finished: false }, error => {
        if (error) {
          this.showErrorDialog = true;
        } else {
          this.$router.push({ name: 'Lobby', params: { roomId: roomId } });
        }
      });
    },
  },
};
</script>
