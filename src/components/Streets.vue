<template>
  <div style="width: 800px; height: 800px">
    <p style="text-decoration: underline">Fooo!</p>
    <div id="street-view-anchor" style="width: 800px'; height: 800px" />
  </div>
</template>



<script>
export default {
  props: {},
  data: function() {
    return {};
  },
  name: 'Streets',
  mounted: function() {
    console.log("mounted");
    const position = new google.maps.LatLng(37.86926,-122.254811);
    new google.maps.StreetViewPanorama(
      document.getElementById('street-view-anchor'),
      {
        position: position,
        pov: { heading: 165, pitch: 0 },
        zoom: 1,
      },
    );
  },
};
</script>
