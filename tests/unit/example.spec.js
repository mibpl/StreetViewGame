import { shallowMount } from '@vue/test-utils';
import Main from '@/views/Main.vue';

describe('Main.vue', () => {
  it('renders Main', () => {
    const wrapper = shallowMount(Main, {});
    expect(wrapper.text()).toMatch('Main/Join view');
  });
});
