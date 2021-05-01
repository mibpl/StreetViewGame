<template>
  <div id="location-picker-container">
    <div id="location-picker-anchor" />
  </div>
</template>


<style scoped>
#location-picker-container {
  height: 500px;
  display: block;
  flex-direction: column;
  flex-wrap: nowrap;
  position: relative;
  bottom: 0;
  left: 0;
}

#location-picker-anchor {
  height: 500px;
}
</style>

<script>
/*global google*/
import maps from '@/maps_util.js';

export default {
  props: {
    pickingEnabled: {
      type: Boolean,
      required: false,
    },
    position: {
      type: Object,
      required: true,
    },
  },
  data: function () {
    return {
    };
  },
  name: 'LocationPicker',
  mounted: function () {
    this.map = new google.maps.Map(
      document.getElementById('location-picker-anchor'),
      {
        zoom: 4,
        center: new google.maps.LatLng(0, 0),
        disableDefaultUI: false,
        streetViewControl: false,
      },
    );
    this.$nextTick(() => {
      this.$emit('on-click', this.position);
    });

    this.marker = new google.maps.Marker({
      position: this.position,
      map: this.map,
      title: '',
    });

    this.circle = new google.maps.Circle({
      clickable: false,
      fillOpacity: 0.2,
      map: this.map,
      center: this.position,
      radius: 0.5 * 1000,
    });

    if (this.pickingEnabled === true) {
      this.map.addListener('click', (event) => {
        maps
          .getClosestPanorama(event.latLng.toJSON(), 2000)
          .then((snappedLatLng) => {
            console.log("found picker position, event fired");
            this.$emit('on-click', snappedLatLng);
          });
      });
    }
  },
  watch: {
    position: function (newPosition) {
      if (this.marker) this.marker.setMap(null);
      if (this.circle) this.circle.setMap(null);

      this.marker = new google.maps.Marker({
        position: newPosition,
        map: this.map,
        title: '',
      });

      this.circle = new google.maps.Circle({
        clickable: false,
        fillOpacity: 0.2,
        map: this.map,
        center: newPosition,
        radius: 0.5 * 1000,
      });
    },
  },
};
</script>
