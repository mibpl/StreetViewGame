<template>
  <div id="player-list-container">
    <div v-for="(player, uuid) in playerGuessStatus" :key="uuid">
      <v-card class="player-readiness-block" elevation="20" color="rgb(180,154,237)">
        {{ player.username }}
        <v-icon v-if="player.guessedThisRound" size="15">mdi-checkbox-marked-circle-outline</v-icon>
        <v-icon v-else size="15">mdi-checkbox-blank-circle-outline</v-icon>
        <v-icon v-if="isChief" v-on:click="kickPlayer(uuid)" size="15">mdi-account-off</v-icon>
      </v-card>
    </div>
  </div>
</template>

<style scoped>
#player-list-container {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
}

.player-readiness-block {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  margin-right: 10px;
}
</style>

<script>
export default {
  props: {
    playerGuessStatus: {
      type: Object,
      required: true,
    },
    isChief: {
      type: Boolean,
      required: true,
    },
  },
  data: function() {
    return {};
  },
  methods: {
    kickPlayer: function(player_uuid) {
      this.$emit('on-kick-player', { player_uuid: player_uuid });
    },
  },
  name: 'PlayerList',
};
</script>
