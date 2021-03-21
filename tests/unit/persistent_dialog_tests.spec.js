import Vue from 'vue';
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import { mount, createLocalVue } from '@vue/test-utils';
import dialogModule from '@/store/modules/persistent_dialog.store';

import PersistentDialog from '@/components/PersistentDialog.vue';

Vue.use(Vuetify);

describe('PersistentDialog', () => {
  let localVue;
  let vuetify;
  let store;

  const mountDialog = options => {
    // Dialog needs to be within data-app tag.
    const outer_div = document.createElement('div');
    outer_div.setAttribute('data-app', true);
    document.body.appendChild(outer_div);
    const div = document.createElement('div');
    outer_div.appendChild(div);

    return mount(PersistentDialog, {
      localVue,
      vuetify,
      store,
      attachTo: div,
      ...options,
    });
  };

  beforeEach(() => {
    localVue = createLocalVue();
    localVue.use(Vuex);
    vuetify = new Vuetify();
    store = new Vuex.Store({
      modules: {
        persistentDialog: dialogModule,
      },
    });
  });

  it('not renered by default', () => {
    const wrapper = mountDialog({});
    expect(wrapper.find('.v-overlay--active').exists()).toBe(false);
  });

  it('is renered after showPersistentDialog', () => {
    store.commit('persistentDialog/showPersistentDialog', {});
    const wrapper = mountDialog({});
    expect(wrapper.get('.v-overlay--active'));
  });

  it('disappears after hidePersistentDialog', async () => {
    store.commit('persistentDialog/showPersistentDialog', {});
    const wrapper = mountDialog({});
    expect(wrapper.get('.v-overlay--active'));
    store.commit('persistentDialog/hidePersistentDialog', {});
    await wrapper.vm.$nextTick();
    expect(wrapper.find('.v-overlay--active').exists()).toBe(false);
  });

  it('renders correct text', () => {
    store.commit('persistentDialog/showPersistentDialog', { text: 'Text' });
    const wrapper = mountDialog({});
    expect(wrapper.find('.v-card__text').text()).toBe('Text');
  });
});
