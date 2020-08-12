<template>
  <div style="width: 800px; height: 800px">
    <p style="text-decoration: underline">Baaa!</p>
    <div id="map-anchor" style="width: 800px'; height: 800px" />
    <button v-on:click="guess()">Make a guess</button>
  </div>
</template>

<script>
/*global google*/

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
      this.$emit('on-guess', this.marker.position);
    },
  },
};
</script>
