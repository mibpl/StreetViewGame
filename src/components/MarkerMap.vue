<template>
  <div id="marker-map-container">
    <div id="map-anchor" />
    <v-btn
      tile
      color="accent"
      v-if="guessingEnabled"
      v-on:click="guess()"
      class="white--text"
    >
      Make a guess
      <p v-if="deadlineTimestamp != null">
        (Time remaining: {{ timeLeft.toFixed(0) }}s)
      </p>
    </v-btn>
    <v-system-bar
      tile
      color="red lighten"
      v-if="!guessingEnabled && deadlineTimestamp != null"
      class="white--text"
    >
      Time remaining: {{ timeLeft.toFixed(0) }}s
    </v-system-bar>
    <!-- <button v-on:click="mathdebug()">Do some math!</button> !-->
  </div>
</template>

<style scoped>
#marker-map-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  position: absolute;
  bottom: 0;
  left: 0;
}

#map-anchor {
  flex-grow: 1;
}
</style>

<script>
/*global google*/
import maps from '@/maps_util.js';
import colors from 'vuetify/lib/util/colors';

export default {
  props: {
    deadlineTimestamp: {
      type: Number,
      required: false,
    },
    guessingEnabled: {
      type: Boolean,
      required: false,
    },
    beaconMarkers: {
      type: Object,
      required: false,
    },
  },
  data: function() {
    return {
      timeLeft: 0,
      lastGuess: {},
      latch: true,
      mapBeacons: {},
    };
  },
  name: 'MarkerMap',
  mounted: function() {
    const position = new google.maps.LatLng(37.86926, -122.254811);
    this.map = new google.maps.Map(document.getElementById('map-anchor'), {
      zoom: 4,
      center: new google.maps.LatLng(0, 0),
      disableDefaultUI: true,
    });

    this.marker = new google.maps.Marker({
      position: position,
      map: this.map,
      title: 'My guess',
    });
    this.map.addListener('click', event => {
      this.marker.setMap(null);
      this.marker = new google.maps.Marker({
        position: event.latLng,
        map: this.map,
        title: 'My guess',
      });
      this.$emit('on-click', this.marker.position.toJSON());
    });
    this.timerCallback = setInterval(() => {
      if (this.deadlineTimestamp != null) {
        const now = new Date().getTime();
        let timeLeft = this.deadlineTimestamp - now;
        if (timeLeft < 0) {
          timeLeft = 0;
          if (this.latch) this.guess();
          this.latch = false;
        } else {
          this.latch = true;
        }
        this.timeLeft = timeLeft / 1000;
      }
    }, 1000);
  },
  methods: {
    guess: function() {
      this.lastGuess = this.marker.position.toJSON();
      this.$emit('on-guess', { latLng: this.marker.position.toJSON() });
    },
    mathdebug: function() {
      for (let i = 0; i < 100; i++) {
        const pos = maps.chooseRandomPointOnSphere();
        new google.maps.Marker({
          position: pos,
          map: this.map,
          title: 'foo',
          label: pos.toString(),
        });
      }
    },
    clearMap: function() {
      while (this.mapObjects.length > 0) {
        this.mapObjects[this.mapObjects.length - 1].setMap(null);
        this.mapObjects.pop();
      }
    },
    updateExistingBeacons: function() {
      for (const [id, beacon] of Object.entries(this.beaconMarkers)) {
        const marker_icon = beacon.connected ? 'glyphish_redo' : 'glyphish_zap';
        const marker_color = beacon.connected
          ? colors.blue.base.substr(1)
          : colors.grey.base.substr(1);
        if (id in this.mapBeacons) {
          this.mapBeacons[id].circle.setOptions({
            strokeColor: beacon.in_range ? colors.blue.base : colors.grey.base,
            fillColor: beacon.in_range ? colors.blue.base : colors.grey.base,
          });
          // TODO: instead of using the chart API, we should have static pins (maybe SVG) to make the rendering
          // less laggy. The chart API means we redownload the icons frequently. This will also help (probably)
          // make the pins within streetview appear more reliably.
          // TODO: test playability on a non-monster laptop.
          this.mapBeacons[id].marker.setOptions({
            clickable: beacon.connected,
            icon: `https://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=${marker_icon}|${marker_color}`,
          });
          for (const [followup_id, followup] of Object.entries(
            beacon?.followups ?? {},
          )) {
            if (!(followup_id in this.mapBeacons[id].followups)) {
              this.mapBeacons[id].followups[
                followup_id
              ] = new google.maps.Marker({
                position: followup.position,
                map: this.map,
                clickable: false,
              });
            }
            if (
              followup?.used &&
              followup_id in this.mapBeacons[id].followups
            ) {
              this.mapBeacons[id].followups[followup_id].setMap(null);
            }
          }
        }
      }
    },
    addNewBeacons: function() {
      for (const [id, beacon] of Object.entries(this.beaconMarkers)) {
        const marker_icon = beacon.connected ? 'glyphish_redo' : 'glyphish_zap';
        const marker_color = beacon.connected
          ? colors.blue.base.substr(1)
          : colors.grey.base.substr(1);
        if (id in this.mapBeacons) {
          continue;
        }
        this.mapBeacons[id] = {
          circle: new google.maps.Circle({
            clickable: false,
            strokeColor: beacon.in_range ? colors.blue.base : colors.grey.base,
            strokeOpacity: 0.5,
            strokeWeight: 2,
            fillColor: beacon.in_range ? colors.blue.base : colors.grey.base,
            fillOpacity: 0.2,
            map: this.map,
            center: beacon.position,
            radius: beacon.radius_km * 1000,
          }),
          marker: new google.maps.Marker({
            position: beacon.position,
            map: this.map,
            icon: `https://chart.apis.google.com/chart?chst=d_map_pin_icon&chld=${marker_icon}|${marker_color}`,
            clickable: beacon.connected,
          }),
          followups: {},
        };
        this.mapBeacons[id].marker.addListener('click', () => {
          this.$emit('on-beacon-click', id);
        });
      }
    },
    refreshBeacons: function() {
      //this.clearMap();
      this.addNewBeacons();
      this.updateExistingBeacons();
    },
  },
  watch: {
    beaconMarkers: function() {
      this.refreshBeacons();
    },
  },
};
</script>
