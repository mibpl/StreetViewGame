<template>
  <div id="game-view-container">
    This isn't the game mode you're looking for.
    Move along.
    <PersistentDialog />
    <Dialog />
  </div>
</template>

<style scoped>
</style>

<script>
import Dialog from '@/components/Dialog';
import PersistentDialog from '@/components/PersistentDialog';

export default {
  name: 'RendezvousGame',
  components: {
    Dialog,
    PersistentDialog,
  },
};
</script>
