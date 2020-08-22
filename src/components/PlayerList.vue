<template>
  <div id="player-list-container">
    <div v-for="(player, uuid) in playerGuessStatus" :key="uuid">
      <div class="player-readiness-block">
        {{ player.username }}
        <p v-if="player.guessedThisRound">[ready]</p>
        <p v-else>[waiting]</p>
        <button v-if="isChief" v-on:click="kickPlayer(uuid)">X</button>
      </div>
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
