<template>
  <v-dialog max-width="290" v-model="dialogVisible">
    <v-card>
      <v-card-title class="headline">
        Connection error
      </v-card-title>
      <v-card-text>
        There was a problem with connection to Firebase :( Try again later.
      </v-card-text>

      <v-card-actions>
        <v-spacer></v-spacer>
        <v-btn color="primary" @click="$emit('close-dialog')">Ok</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script>
export default {
  props: {
    show: Boolean,
  },
  data: function() {
    return {
      dialogVisible: false,
    };
  },
  name: 'ErrorDialog',
  watch: {
    // eslint-disable-next-line no-unused-vars
    dialogVisible: function(newValue, _oldValue) {
      if (newValue === false) {
        this.$emit('close-dialog');
      }
    },
    // eslint-disable-next-line no-unused-vars
    show: function(newValue, _oldValue) {
      this.dialogVisible = newValue;
    },
  },
};
</script>
