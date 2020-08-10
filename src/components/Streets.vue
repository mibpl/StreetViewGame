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
    const position = new google.maps.LatLng(37.75598,-122.41231);
    new google.maps.StreetViewPanorama(
      document.getElementById('street-view-anchor'),
      {
        position: position,
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
};
</script>
