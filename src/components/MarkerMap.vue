<template>
  <div style="width: 800px; height: 800px">
    <p style="text-decoration: underline">Baaa!</p>
    <div id="map-anchor" style="width: 800px'; height: 800px" />
    <button v-on:click="guess()">Make a guess</button>
    <button v-on:click="mathdebug()">Do some math!</button>
  </div>
</template>

<script>
/*global google*/
import maps from '@/maps_util.js';

export default {
  props: {},
  data: function() {
    return {};
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
    });
  },
  methods: {
    guess: function() {
      this.$emit('on-guess', { latLng: this.marker.position.toJSON() });
    },
    mathdebug: function() {
      for (let i = 0; i < 100; i++) {
        const pos = maps.chooseRandomPointOnSphere();
        console.log(pos.toJSON());
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
