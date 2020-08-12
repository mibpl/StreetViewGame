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
            <div>Waiting for {{ chief }} to start the game...</div>
          </v-card-text>
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
// Lobby is used for waiting for other players to join.
// The chief of the room can start the game at any moment.
// In future, potential options (eg. only Poland) can be chosen here.

export default {
  name: 'Lobby',
  data: function() {
    return {
      connected_players_names: [],
      chief: 'Pluto',
    };
  },
  methods: {
    isChief() {
      return true;
    },
    startGame() {
      this.$router.push({
        name: 'game',
        params: { roomId: this.$route.params.roomId },
      });
    },
  },
  components: {},
};
</script>
