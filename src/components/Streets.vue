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
    <v-container v-if="jumpButtonsEnabled">
      <v-btn
        id="jump-button-500"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(500)"
      >500km</v-btn>
      <v-btn
        id="jump-button-50"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(50)"
      >50km</v-btn>
      <v-btn
        id="jump-button-10"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(10)"
      >10km</v-btn>
      <v-btn
        id="jump-button-1"
        class="jump-button"
        fab
        elevation="0"
        color="secondary"
        @click="jump(1)"
      >1km</v-btn>
    </v-container>
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

.jump-button {
  position: absolute;
  z-index: 2;
  right: 10px;
  width: 50px;
  height: 50px;
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

#jump-button-1 {
  bottom: 310px;
}

#jump-button-10 {
  bottom: 410px;
}

#jump-button-50 {
  bottom: 510px;
}

#jump-button-500 {
  bottom: 610px;
}

#street-view-anchor {
  flex-grow: 1;
}
</style>

<script>
import maps from '@/maps_util.js';

/*global google*/

const DEFAULT_POV = { heading: -110, pitch: 0 };

export default {
  props: {
    initialMapPosition: {
      type: Object,
      required: true,
    },
    jumpButtonsEnabled: {
      type: Boolean,
      required: true,
    },
  },
  data: function() {
    return {
      mapPosition: { lat: 37.75598, lng: -122.41231 },
    };
  },
  name: 'Streets',
  methods: {
    goBackToStart: function() {
      this.panorama.setPosition(this.initialMapPosition);
      this.panorama.setPov(DEFAULT_POV);
    },
    jump: async function(distance_km) {
      const position = this.panorama.getPosition();
      let bearing_deg = this.panorama.getPov().heading;
      if (bearing_deg > 180) {
        bearing_deg = bearing_deg - 360;
      }
      const new_position = await maps.jumpByDistanceAndBearing(
        {lat: position.lat(), lng: position.lng()}, distance_km, bearing_deg);
      if (new_position != null) {
        console.log(
          "Closest panorama is at lat: ", new_position.destination.lat,
          "; lng: ", new_position.destination.lng,
          "distance: ", new_position.distance_km);
        this.panorama.setPosition(new_position.destination);
      } else {
        console.log("Can't find panorama in this direction.");
      }
    },
  },
  mounted: function() {
    this.panorama = new google.maps.StreetViewPanorama(
      document.getElementById('street-view-anchor'),
      {
        position: this.initialMapPosition,
        pov: DEFAULT_POV,
        zoom: 1,
        addressControl: false,
        clickToGo: true,
        fullscreenControl: false,
        imageDateControl: false,
        linksControl: false,
        showRoadLabels: false,
        panControl: true,
      },
    );
    this.panorama.addListener("position_changed", () => {
      const pos = this.panorama.getPosition();
      this.mapPosition = pos.toJSON();
      console.log("Position changed in streetview:", this.mapPosition);
    });
  },
  watch: {
    initialMapPosition: function(newValue, oldValue) {
      console.log(
        "initialMapPosition changed, forcing streetview position to: ",
        newValue);
      this.panorama.setPosition(newValue);
    },
    mapPosition: function(newValue, oldValue) {
      console.log(
        "mapPosition changed to", newValue, "emitting position_changed");
      this.$emit('position_changed', newValue);
    },
  },
};
</script>
