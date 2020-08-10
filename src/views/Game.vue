<template>
  <div>
    <span>Game view</span>
    <Streets />
    <MarkerMap />
  </div>
</template>

<script>
// This is the main view for the actual game.
import Streets from '@/components/Streets.vue';
import MarkerMap from '@/components/MarkerMap.vue';

export default {
  name: 'Game',
  components: {
    Streets,
    MarkerMap
  },
};
</script>
