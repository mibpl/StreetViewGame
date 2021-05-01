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
  props: {},
  data: function () {
    return {
      position: new google.maps.LatLng(37.75596, -122.412312),
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
      this.$emit('on-click', this.position.toJSON());
    });

    this.marker = new google.maps.Marker({
      position: this.position,
      map: this.map,
      title: 'Location Picker',
    });
    this.map.addListener('click', (event) => {
      maps.getClosestPanorama(event.latLng.toJSON(), 2000).then((snappedLatLng) => {
        this.marker.setMap(null);
        this.marker = new google.maps.Marker({
          position: snappedLatLng,
          map: this.map,
          title: '',
        });
        this.$emit('on-click', snappedLatLng);
      });
    });
  },
};
</script>
