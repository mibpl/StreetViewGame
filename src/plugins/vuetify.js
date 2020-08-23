import Vue from 'vue';
import Vuetify from 'vuetify/lib';

// Use the same colors for both dark and light.
const colors = {
  primary: '#1976D2',
  secondary: '#226F54',
  tertiary: '#87C38F',
  quaternary: '#F4F0BB',
  accent: '#D50000',
};

Vue.use(Vuetify);

export default new Vuetify({
  theme: {
    themes: {
      light: colors,
      dark: colors,
    },
  },
});
