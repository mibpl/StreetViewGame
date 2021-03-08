<template>
  <div id="rendezvous-results" />
</template>
<style scoped>
#rendezvous-results {
  position: fixed;
  width: 75vw;
  height: 75vh;
  overflow: hidden;
  max-height: calc(90vh - 150px);
}
</style>

<script>
/*global google*/
import sanitizeHtml from 'sanitize-html';
import colors from 'vuetify/lib/util/colors';
import maps_util from '../maps_util';

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
  },
  data: function() {
    return {};
  },
  name: 'RendezvousResults',
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

      this.markers = [];
    },
    randomElement: function(arr) {
      return arr[Math.floor(Math.random() * arr.length)];
    },
    randomColor: function() {
      let color_group = this.randomElement(Object.values(colors));
      return color_group.base;
    },
    refreshMarkers: function() {
      this.wipeMarkers();
      this.mountMap();

      if (this.players == null || this.player_data == null) {
        console.log('Players or player_data is missing');
        return;
      }
      const final_positions = [];
      for (const key of Object.keys(this.players)) {
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
        const startMarker = new google.maps.Marker({
          position: starting_position,
          map: this.map,
          title: `Start for ${username}`,
          label: `Start for ${username}`,
        });
        this.markers.push(startMarker);
        let deduped_history = [starting_position];
        let total_distance = 0;
        let last_position = starting_position;
        for (const position of Object.values(position_history)) {
          if (deduped_history[deduped_history.length - 1] == position) {
            continue;
          }
          deduped_history.push(position);
          total_distance += maps_util.haversine_distance(
            last_position,
            position,
          );
          last_position = position;
        }
        const info = new google.maps.InfoWindow({
          content: `${sanitizedUsername}: ${total_distance.toFixed(2)} km`,
        });
        info.open(this.map, startMarker);
        let color = this.randomColor();
        const line = new google.maps.Polyline({
          path: deduped_history,
          map: this.map,
          strokeColor: color,
        });
        this.markers.push(line);
      }
      const final_center_point = maps_util.centerPoint(final_positions);
      const endMarker = new google.maps.Marker({
        position: final_center_point,
        map: this.map,
        title: `Rendevous point`,
        label: `Rendevous point`,
      });
      this.markers.push(endMarker);
    },
  },
  mounted: function() {
    this.refreshMarkers();
  },
};
</script>
