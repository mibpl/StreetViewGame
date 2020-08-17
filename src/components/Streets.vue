<template>
  <div id="street-view-container">
    <div id="street-view-anchor" style="width: 600px'; height: 600px" />
  </div>
</template>

<style scoped>

#street-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  position: absolute;
}

#street-view-anchor {
  flex-grow: 1;
}

</style>

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
    },
  },
  mounted: function() {
    this.refreshView();
  },
  updated: function() {
    this.refreshView();
  },
};
</script>
