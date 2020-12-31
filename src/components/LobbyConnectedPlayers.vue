<template>
  <v-card outlined>
    <v-card-title>Connected players</v-card-title>
    <v-card-text v-if="connectedPlayersNames.length == 0">
      <div>No one has joined yet...</div>
    </v-card-text>
    <v-list v-if="connectedPlayersNames.length > 0">
      <v-list-item
        v-for="player_name in connectedPlayersNames"
        :key="player_name"
      >
        <v-list-item-title>{{ player_name }}</v-list-item-title>
      </v-list-item>
    </v-list>
  </v-card>
</template>

<script>
export default {
  name: 'LobbyConnectedPlayers',
  props: {
    connectedPlayersNames: {
      type: Array,
      required: true,
    },
  },
  data: function() {
    return {};
  },
};
</script>
