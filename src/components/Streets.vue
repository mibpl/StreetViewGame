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
import Vue from 'vue';

const DEFAULT_POV = { heading: -110, pitch: 0 };

export default {
  props: {
    mapPosition: {
      type: Object,
      required: true,
    },
  },
  data: function() {
    return {};
  },
  name: 'Streets',
  methods: {},
  mounted: function() {
    this.panorama = new google.maps.StreetViewPanorama(
      document.getElementById('street-view-anchor'),
      {
        position: this.mapPosition,
        pov: DEFAULT_POV,
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
  watch: {
    mapPosition: function(newValue, oldValue) {
      // this is stupid, why do I even bother...
      if (JSON.stringify(oldValue) != JSON.stringify(newValue)) {
        this.$nextTick(function() {
          this.panorama.setPosition(this.mapPosition);
          this.panorama.setPov(DEFAULT_POV);
        });
      }
    },
  },
};
</script>
