<template>
  <div>
    <p style="text-decoration: underline">Leaderboard</p>
    <table>
      <tr v-for="(player, player_uuid) in players">
        <td>{{player.username}}</td>
        <td
          v-for="round_id in Object.keys(roundSummaries[player_uuid]).sort()"
        >{{roundSummaries[player_uuid][round_id].toFixed(2)}}</td>
        <td>
          <b>{{ totalScore[player_uuid].toFixed(2) }}</b>
        </td>
      </tr>
    </table>
  </div>
</template>

<script>
/*global google*/
export default {
  props: {
    roundSummaries: {
      type: Object,
      required: true,
    },
    players: {
      type: Object,
      required: true,
    },
  },
  data: function() {
    return {};
  },
  computed: {
    totalScore: function() {
      const totalScore = {};
      for (const player_uuid in this.roundSummaries) {
        totalScore[player_uuid] = 0;
        for (const round_id in this.roundSummaries[player_uuid]) {
          totalScore[player_uuid] += this.roundSummaries[player_uuid][round_id];
        }
      }
      return totalScore;
    },
  },
  name: 'Leaderboard',
};
</script>
