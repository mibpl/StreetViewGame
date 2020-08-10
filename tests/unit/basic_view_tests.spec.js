import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import Main from '@/views/Main.vue';
import { newStore } from '@/store';
import firebase from 'firebase/app';

Vue.use(Vuetify);

const localVue = createLocalVue();

describe('Main View', () => {
  const mountFunction = options => {
    return shallowMount(Main, {
      localVue,
      vuetify,
      store,
      ...options,
    });
  };
  let vuetify;
  let store;
  const rootRouter = {
    path: '/',
    params: {},
  };
  const joinRouter = {
    path: '/join/room',
    params: {
      roomId: 'room',
    },
  };

  beforeEach(() => {
    jest.spyOn(firebase, 'auth').mockImplementation(() => {
      return {
        signInAnonymously: jest.fn(() => Promise.resolve()),
        onAuthStateChanged: jest.fn(),
      };
    });
    vuetify = new Vuetify();
    store = newStore();
  });

  it('does not render Play button if not from join link', () => {
    const wrapper = mountFunction({
      mocks: {
        $route: rootRouter,
      },
    });
    expect(wrapper.find('#play_btn').exists()).toBe(false);
  });

  it('renders Play button from join link', () => {
    const wrapper = mountFunction({
      mocks: {
        $route: joinRouter,
      },
    });
    expect(wrapper.find('#play_btn').exists()).toBe(true);
  });
});
