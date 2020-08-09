import Vue from 'vue';
import Vuetify from 'vuetify';
import { shallowMount, createLocalVue } from '@vue/test-utils';
import Main from '@/views/Main.vue';

Vue.use(Vuetify);

const localVue = createLocalVue();

describe('Main View', () => {
  const mountFunction = options => {
    return shallowMount(Main, {
      localVue,
      vuetify,
      ...options,
    });
  };
  let vuetify;

  beforeEach(() => {
    vuetify = new Vuetify();
  });

  it('does not render Play button if not from join link', () => {
    const $route = {
      path: '/',
      params: {},
    };
    const wrapper = mountFunction({
      mocks: {
        $route,
      },
    });
    expect(wrapper.find('#play_btn').exists()).toBe(false);
  });

  it('renders Play button from join link', () => {
    const $route = {
      path: '/join/room',
      params: {
        roomId: 'room',
      },
    };
    const wrapper = mountFunction({
      mocks: {
        $route,
      },
    });
    expect(wrapper.find('#play_btn').exists()).toBe(true);
  });
});
