<template>
  <div>
    <span>Game view</span>
    <Streets />
  </div>
</template>

<script>
// This is the main view for the actual game.
import Streets from '@/components/Streets.vue';

export default {
  name: 'Game',
  components: {
    Streets,
  },
};
</script>
