<template>
  <div id="round-summary-map-anchor" />
</template>
<style scoped>
#round-summary-map-anchor {
  position: fixed;
  width: 35vw;
  height: 75vh;
  overflow: hidden;
  max-height: calc(90vh - 150px);
}
</style>

<script>
/*global google*/
import sanitizeHtml from 'sanitize-html';

export default {
  props: {
    players: {
      type: Object,
      required: true,
    },
    guesses: {
      type: Object,
      required: true,
    },
    mapPosition: {
      type: Object,
      required: true,
    },
    summary: {
      type: Object,
      required: true,
    },
  },
  data: function() {
    return {};
  },
  computed: {
    player_ready_list: function() {
      const arr = [];
      for (const key in this.players) {
        const player = this.players[key];
        arr.push({
          player_uuid: key,
          player_name: player.username,
          has_guess: this.guesses[key] !== undefined,
          guess: this.guesses[key],
        });
      }
      return arr;
    },
    all_guessed: function() {
      let all_guessed = true;
      for (const e in this.player_ready_list) {
        if (!e.has_guess) all_guessed = false;
      }
      return all_guessed;
    },
  },
  name: 'RoundStatus',
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
        document.getElementById('round-summary-map-anchor'),
        {
          zoom: 1,
          center: new google.maps.LatLng(0, 0),
          disableDefaultUI: true,
        },
      );

      this.markers = [];
    },
    refreshMarkers: function() {
      this.wipeMarkers();
      this.mountMap();

      const originMarker = new google.maps.Marker({
        position: this.mapPosition,
        map: this.map,
        title: 'origin',
        animation: google.maps.Animation.BOUNCE,
        label: 'Origin',
      });
      this.markers.push(originMarker);

      for (const k in this.player_ready_list) {
        const e = this.player_ready_list[k];
        if (e.has_guess && e.guess && e.guess.latLng) {
          const pos = new google.maps.LatLng(
            e.guess.latLng.lat,
            e.guess.latLng.lng,
          );
          const m = new google.maps.Marker({
            position: pos,
            map: this.map,
            title: e.player_uuid,
          });
          const sanitizedUsername = sanitizeHtml(e.player_name, {
            allowedTags: [],
            allowedAttributes: {},
            disallowedTagsMode: 'recursiveEscape',
          });
          const distance = this.summary[e.player_uuid].distance.toFixed(2);
          const info = new google.maps.InfoWindow({
            content: `${sanitizedUsername}: ${distance} km`,
          });
          info.open(this.map, m);
          var line = new google.maps.Polyline({
            path: [pos, this.mapPosition],
            map: this.map,
          });
          this.markers.push(line);
          this.markers.push(m);
        }
      }
    },
  },
  watch: {
    player_ready_list: function() {
      this.refreshMarkers();
    },
  },
  mounted: function() {
    this.wipeMarkers();
    this.mountMap();
    this.refreshMarkers();
  },
};
</script>
