<template>
  <div id="street-view-container">
    <v-btn
      id="back-to-position-button"
      class="custom-control-button"
      fab
      elevation="0"
      color="secondary"
      @click="goBackToStart"
    >
      <v-icon large>mdi-anchor</v-icon>
    </v-btn>
    <div id="street-view-anchor" />
  </div>
</template>

<style scoped>
.custom-control-button {
  position: absolute;
  z-index: 2;
  right: 10px;
  bottom: 210px;
}

#street-view-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
}

#back-to-position-button {
  width: 50px;
  height: 50px;
}

#street-view-anchor {
  flex-grow: 1;
}
</style>

<script>
/*global google*/

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
  methods: {
    goBackToStart: function() {
      this.panorama.setPosition(this.mapPosition);
      this.panorama.setPov(DEFAULT_POV);
    },
  },
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
