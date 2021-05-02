<template>
  <v-container>
    <v-card-text>
      <v-simple-table dense>
        <thead>
          <tr>
            <th class="text-left">Goal Proximity</th>
            <th class="text-left">km away from you</th>
          </tr>
        </thead>
        <tbody name="board-table" is="transition-group">
          <tr v-for="{ username, distance_km, distance_to_player_km, uuid } in sortedBoard" :key="uuid">
            <td>{{ username }}</td>
            <td>{{ (distance_to_player_km / 10).toFixed(0) * 10 }}</td>
            <!-- <td>{{ distance_km }}</td> -->
          </tr>
        </tbody>
        <p >Refreshes every {{(refreshCooldownMs/1000).toFixed(1)}} s ({{nextUpdateInSec.toFixed(1)}})</p>
      </v-simple-table>
      
    </v-card-text>
  </v-container>
</template>

<style scoped>
.board-table-move {
  transition: transform 1s;
}
</style>

<script>
export default {
  props: {
    currentPlayerPositions: {
      type: Object,
      required: true,
    },
    refreshCooldownMs: {
      type: Number,
      required: false,
      default: 20*1000,
    }
  },
  data: function () {
    return {
      periodicPlayerPositions: null,
      lastUpdated: 0,
      nextUpdateInSec: 0,
    };
  },
  computed: {
    sortedBoard: function () {
      let arr = [];
      for (const uuid in this.periodicPlayerPositions) {
        const noise = Math.random() * 10 - 5;
        arr.push({
          uuid: uuid,
          username: this.periodicPlayerPositions[uuid].name,
          distance_km: this.periodicPlayerPositions[uuid].distanceKm + noise,
          distance_to_player_km: this.periodicPlayerPositions[uuid].distanceToPlayerKm,
        });
      }
      arr.sort((a, b) => a.distance_km - b.distance_km);
      return arr;
    },
  },
  methods: {
    maybeUpdateBoardOnCooldown() {
      const now = Date.now();
      this.nextUpdateInSec = Math.max(0, this.lastUpdated + this.refreshCooldownMs - now) / 1000;
      if (this.nextUpdateInSec <= 0) {
        this.periodicPlayerPositions = this.currentPlayerPositions;
        this.lastUpdated = now;
        this.nextUpdateInSec = 0;
      }
    }
  },
  beforeDestroy() {
    clearInterval(this.timer);
  },
  created() {
    this.lastUpdated = Date.now();
    this.timer = setInterval(() => {this.maybeUpdateBoardOnCooldown()}, 1000);
  },
  name: 'RankBoard',
};
</script>
