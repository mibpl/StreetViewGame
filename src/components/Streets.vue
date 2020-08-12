<template>
  <div style="width: 800px; height: 800px">
    <p style="text-decoration: underline">Fooo!</p>
    <p>{{ mapPosition }}</p>
    <div id="street-view-anchor" style="width: 800px'; height: 800px" />
  </div>
</template>

<script>
/*global google*/
export default {
  props: {
    mapPosition: {
      type: google.maps.LatLng,
      required: true,
    },
  },
  data: function() {
    return {};
  },
  name: 'Streets',
  methods: {
    refreshView: function() {
      this.panorama = new google.maps.StreetViewPanorama(
        document.getElementById('street-view-anchor'),
        {
          position: this.mapPosition,
          pov: { heading: -110, pitch: 0 },
          zoom: 1,
          addressControl: false,
          clickToGo: true,
          fullscreenControl: false,
          imageDateControl: false,
          linksControl: false,
          showRoadLabels: false,
        },
      );
    }
  },
  mounted: function() {
    this.refreshView();
  },
  updated: function() {
    this.refreshView();
  },
};
</script>
