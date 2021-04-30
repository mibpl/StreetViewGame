<template>
  <v-container>
    <v-card-text>
      <v-simple-table dense>
        <thead>
          <tr>
            <th class="text-left">Goal Proximity</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="{ username, distance_km } in sortedBoard" :key="username">
            <td>{{ username }}</td>
            <!-- <td>{{ distance_km }}</td> -->
          </tr>
        </tbody>
      </v-simple-table>
    </v-card-text>
  </v-container>
</template>

<script>
export default {
  props: {
    playerPositions: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {};
  },
  computed: {
    sortedBoard: function () {
      console.log(this.playerPositions);
      let arr = [];
      for (const uuid in this.playerPositions) {
        arr.push({
          username: this.playerPositions[uuid].name,
          distance_km: this.playerPositions[uuid].distanceKm,
        });
      }
      arr.sort((a, b) => a.distance_km - b.distance_km);
      return arr;
    },
  },
  name: 'RankBoard',
};
</script>
