<template>
  <v-snackbar v-model="visible" timeout="-1" v-bind:color="color">
    {{ text }}
  </v-snackbar>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

export default {
  name: 'Toast',
  computed: {
    visible: {
      get() {
        return this.$store.state.toast.visible;
      },
      set(value) {
        this.setToastVisibility(value);
      },
    },
    ...mapState({
      text: state => state.toast.text,
      color: state => state.toast.color,
    }),
  },
  methods: {
    ...mapMutations('toast', ['setToastVisibility']),
  },
};
</script>
