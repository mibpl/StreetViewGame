<template>
  <div>
    <span>Game view</span>
    <Streets v-bind:mapPosition="mapPosition" />
    <MarkerMap />
  </div>
</template>

<script>
/*global google*/

// This is the main view for the actual game.
import Streets from '@/components/Streets.vue';
import MarkerMap from '@/components/MarkerMap.vue';

export default {
  name: 'Game',
  components: {
    Streets,
    MarkerMap,
  },
  data: function() {
    return {
      mapPosition: new google.maps.LatLng(37.75598,-122.41231),
    }
  }
};
</script>
