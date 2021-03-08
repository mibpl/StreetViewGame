<template>
  <div id="marker-map-container">
    <div id="map-anchor" />
    <v-btn tile color="accent" v-if="guessingEnabled"
           v-on:click="guess()" class="white--text">
      Make a guess
      <p v-if="deadlineTimestamp != null">({{ timeLeft.toFixed(0) }}s)</p>
    </v-btn>
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
  },
  data: function() {
    return {
      timeLeft: 0,
      lastGuess: {},
      latch: true,
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
  },
};
</script>
