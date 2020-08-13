import Vue from 'vue';
import Vuex from 'vuex';
import Vuetify from 'vuetify';
import { mount, createLocalVue } from '@vue/test-utils';
import { newStore } from '@/store';
import firebase from 'firebase/app';

import Dialog from '@/components/Dialog.vue';

Vue.use(Vuetify);

describe('Dialog', () => {
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

    return mount(Dialog, {
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
    jest.spyOn(firebase, 'auth').mockImplementation(() => {
      return {
        signInAnonymously: jest.fn(() => Promise.resolve()),
        onAuthStateChanged: jest.fn(),
      };
    });
    vuetify = new Vuetify();
    store = newStore();
  });

  it('not renered by default', () => {
    const wrapper = mountDialog({});
    expect(wrapper.find('.v-dialog--active').exists()).toBe(false);
  });

  it('is renered after showDialog', () => {
    store.commit('showDialog', {});
    const wrapper = mountDialog({});
    expect(wrapper.get('.v-dialog--active'));
  });

  it('renders correct title and text', () => {
    store.commit('showDialog', { title: 'Title', text: 'Text' });
    const wrapper = mountDialog({});
    expect(wrapper.find('.v-card__title').text()).toBe('Title');
    expect(wrapper.find('.v-card__text').text()).toBe('Text');
  });

  it('disappears on button click', async () => {
    store.commit('showDialog', { title: 'Title', text: 'Text' });
    const wrapper = mountDialog({});

    expect(wrapper.find('.v-dialog--active').exists()).toBe(true);
    await wrapper.get('#confirm_btn').trigger('click');
    expect(wrapper.find('.v-dialog--active').exists()).toBe(false);
  });

  it('triggers action on button click', async () => {
    const mockConfirmFn = jest.fn();
    store.commit('showDialog', {
      title: 'Title',
      text: 'Text',
      confirmAction: mockConfirmFn,
    });
    const wrapper = mountDialog({});

    await wrapper.get('#confirm_btn').trigger('click');
    expect(mockConfirmFn.mock.calls.length).toBe(1);
  });
});
