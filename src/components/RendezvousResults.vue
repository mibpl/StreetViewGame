<template>
  <div id="rendezvous-card">
    <v-card class="d-flex flex-row" flat>
      <v-card class="px-3 py-0 ma-0 flex-shrink-1" flat>
        <v-data-table :headers="details_headers" :items="detailedResults"
        hide-default-footer
        ></v-data-table>
      </v-card>
      <v-card class="d-flex flex-column flex-grow-1" flat>
        <v-card class="px-3 py-0 ma-0" flat>
          <v-slider
            label="Game duration"
            thumb-label="always"
            v-bind:max="timelineProps.minutes"
            v-model="maxTimeMinutes"
          >
            <template v-slot:thumb-label="{ value }"> {{ value }}m </template>
          </v-slider>
        </v-card>
        <v-card class="d-flex flex-row" flat>
          <v-card v-for="user in users" v-bind:key="user.key" flat>
            <v-checkbox
              class="mx-1 my-0 pa-0 player-checkbox"
              v-model="selectedPlayers"
              v-bind:label="user.username"
              v-bind:value="user.key"
              v-bind:background-color="user.color"
              dark
              dense
            ></v-checkbox>
          </v-card>
        </v-card>
        <div id="rendezvous-results" />
      </v-card>
    </v-card>
  </div>
</template>
<style scoped>
#rendezvous-results {
  height: 65vh;
}
#rendezvous-card {
  height: 75vh;
}
</style>

<script>
/*global google*/
import sanitizeHtml from 'sanitize-html';
import maps_util from '@/maps_util';

export default {
  props: {
    players: {
      type: Object,
      required: true,
    },
    player_data: {
      type: Object,
      required: true,
    },
    victory: {
      type: Boolean,
      required: true,
    },
    goal: {
      type: Object,
      required: false,
    }
  },
  data: function() {
    return {
      markers: [],
      selectedPlayers: [],
      // Giant constant used to force the slider to be at the end initially.
      maxTimeMinutes: 10000,
      details_headers: [
        {
          value: 'player',
          text: 'Player',
        },
        {
          value: 'distance',
          text: 'Distance',
        },
      ],
    };
  },
  name: 'RendezvousResults',
  computed: {
    timelineProps: function() {
      if (this.players == null || this.player_data == null) {
        console.error('Players or player_data is missing');
        return;
      }
      let startTimes = [];
      let endTimes = [];
      for (const key of Object.keys(this.players)) {
        const position_history = this.player_data[key].position_history;
        startTimes.push(position_history[0].time);
        endTimes.push(position_history[position_history.length - 1].time);
      }
      const startTime = Math.min(...startTimes);
      const endTime = Math.max(...endTimes);
      const minutes = Math.ceil((endTime - startTime) / 1000 / 60);
      return {
        startTime: startTime,
        endTime: endTime,
        minutes: minutes,
      };
    },
    users: function() {
      if (this.players == null || this.player_data == null) {
        console.error('Players or player_data is missing');
        return;
      }
      let output = [];
      for (const key of Object.keys(this.players)) {
        output.push({
          key: key,
          username: this.players[key].username,
          color: maps_util.colorForUuid(key, Object.keys(this.players)),
        });
      }
      return output;
    },
    detailedResults: function() {
      if (this.players == null || this.player_data == null) {
        console.error('Players or player_data is missing');
        return;
      }
      let results = [];
      for (const key of Object.keys(this.players)) {
        const username = this.players[key].username;
        const sanitizedUsername = sanitizeHtml(username, {
          allowedTags: [],
          allowedAttributes: {},
          disallowedTagsMode: 'recursiveEscape',
        });
        const position_history = this.player_data[key].position_history;
        let total_distance = 0;
        let last_position = position_history[0];
        for (const position of Object.values(position_history)) {
          total_distance += maps_util.haversine_distance(
            last_position,
            position,
          );
          last_position = position;
        }
        results.push({
          player: sanitizedUsername,
          distance: `${total_distance.toFixed(2)} km`,
        });
      }
      return results;
    },
  },
  methods: {
    wipeMarkers: function() {
      if (this.markers !== undefined) {
        this.markers.forEach(e => {
          e.setMap(null);
        });
      }
      this.markers = [];
    },
    mountMap: function() {
      this.map = new google.maps.Map(
        document.getElementById('rendezvous-results'),
        {
          zoom: 1,
          center: new google.maps.LatLng(0, 0),
          disableDefaultUI: true,
        },
      );
    },
    refreshMarkers: function() {
      this.wipeMarkers();

      if (this.players == null || this.player_data == null) {
        console.error('Players or player_data is missing');
        return;
      }
      const final_positions = [];
      const maxTimestamp =
        this.timelineProps.startTime + this.maxTimeMinutes * 1000 * 60;
      for (const key of Object.keys(this.players)) {
        if (this.selectedPlayers.find(v => v == key) == null) {
          continue;
        }
        const username = this.players[key].username;
        const map_position = this.player_data[key].map_position;
        final_positions.push(map_position);
        const sanitizedUsername = sanitizeHtml(username, {
          allowedTags: [],
          allowedAttributes: {},
          disallowedTagsMode: 'recursiveEscape',
        });
        const position_history = this.player_data[key].position_history;
        const starting_position = position_history[0];
        let color = maps_util.colorForUuid(key, Object.keys(this.players));
        const startMarker = new google.maps.Marker({
          position: starting_position,
          map: this.map,
          title: `Start for ${username}`,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            strokeColor: color,
            scale: 5,
          },
        });
        this.markers.push(startMarker);
        let deduped_history = [starting_position];
        let total_distance = 0;
        let last_position = starting_position;
        for (const position of Object.values(position_history)) {
          if (
            last_position.lat == position.lat &&
            last_position.lng == position.lng
          ) {
            continue;
          }
          if (position.time > maxTimestamp) {
            break;
          }
          deduped_history.push(position);
          total_distance += maps_util.haversine_distance(
            last_position,
            position,
          );
          last_position = position;
        }
        const lineSymbol = {
          path: google.maps.SymbolPath.FORWARD_OPEN_ARROW,
          strokeOpacity: 0.5,
        };
        const line = new google.maps.Polyline({
          path: deduped_history,
          map: this.map,
          strokeColor: color,
          icons: [
            {
              icon: lineSymbol,
              offset: '5%',
              repeat: '5%',
            },
          ],
          strokeOpacity: 0.7,
        });
        this.markers.push(line);
      }
      if (this.goal) {
        const goalMarker = new google.maps.Marker({
          position: this.goal,
          map: this.map,
          title: "Goal",
          label: "Goal",
        });
        this.markers.push(goal);
      }
      if (this.victory) {
        const final_center_point = maps_util.centerPoint(final_positions);
        const endMarker = new google.maps.Marker({
          position: final_center_point,
          map: this.map,
          title: `Rendezvous point`,
          label: `Rendezvous point`,
        });
        this.markers.push(endMarker);
      }
    },
  },
  mounted: function() {
    this.mountMap();
    this.selectedPlayers = Object.keys(this.players);
    this.refreshMarkers();
  },
  watch: {
    selectedPlayers: function() {
      this.refreshMarkers();
    },
    maxTimeMinutes: function() {
      this.refreshMarkers();
    },
  },
};
</script>
