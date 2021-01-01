<template>
  <v-dialog max-width="60vw" v-model="visible">
    <v-card>
      <v-card-title class="headline">
        {{ title }}
      </v-card-title>
      <v-card-text>
        {{ text }}
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn id="confirm_btn" color="primary" @click="visible = false">
          Ok
        </v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
import { mapState, mapMutations } from 'vuex';

export default {
  name: 'Dialog',
  computed: {
    visible: {
      get() {
        return this.$store.state.dialog.visible;
      },
      set(value) {
        this.setDialogVisibility(value);
        if (!value && this.confirmAction) {
          this.confirmAction();
        }
      },
    },
    ...mapState({
      title: state => state.dialog.title,
      text: state => state.dialog.text,
      confirmAction: state => state.dialog.confirmAction,
    }),
  },
  methods: {
    ...mapMutations('dialog', ['setDialogVisibility']),
  },
};
</script>
