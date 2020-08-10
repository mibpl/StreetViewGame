<template>
  <div style="width: 800px; height: 800px">
    <p style="text-decoration: underline">Baaa!</p>
    <div id="map-anchor" style="width: 800px'; height: 800px" />
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
    const position = new google.maps.LatLng(37.86926,-122.254811);
    const map = new google.maps.Map(document.getElementById('map-anchor'), {
      zoom: 4,
      center: new google.maps.LatLng(0,0)
    });

    const marker = new google.maps.Marker({
      position: position,
      map: map,
      title: 'Hello World!'
    });
  },
};
</script>
