<template>
  <v-container>
    <v-card-text>
      <v-simple-table dense>
        <thead>
          <tr>
            <th class="text-left">Player</th>
            <th class="text-left" v-for="i in roundsSize" v-bind:key="i">
              Round {{ i }}
            </th>
            <th class="text-left">Total</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="{ username, summaries, total } in sortedResults"
            :key="username"
          >
            <td>{{ username }}</td>
            <td v-for="(_, round_id) in roundsSize" :key="round_id">
              {{ summaries[round_id].toFixed(2) }}
            </td>
            <td>
              <b>{{ total.toFixed(2) }}</b>
            </td>
          </tr>
        </tbody>
      </v-simple-table>
    </v-card-text>
  </v-container>
</template>

<script>
export default {
  props: {
    roundSummaries: {
      type: Object,
      required: true,
    },
    roundsSize: {
      type: Number,
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
    sortedResults: function() {
      let results = [];
      for (const player_uuid in this.players) {
        const username = this.players[player_uuid].username;
        const total = Object.values(this.roundSummaries[player_uuid]).reduce(
          (a, b) => a + b,
          0,
        );
        results.push({
          username,
          summaries: this.roundSummaries[player_uuid],
          total,
        });
      }
      results.sort(function(a, b) {
        return b.total - a.total;
      });
      return results;
    },
  },
  name: 'Leaderboard',
};
</script>
