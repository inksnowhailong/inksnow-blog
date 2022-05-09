import { InjectionKey } from "vue";
import { createStore, Store,useStore as baseUseStore } from "vuex";

export interface State{
  liPage: string
}
export const key:InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state() {
    return {
      // 博客页内容组件名称
      liPage: "AboutHighlightCode",
    };
  },
  mutations: {
    // 切换博客页内容
    changePage(state, payload) {
      state.liPage = payload;
    },
  },
});
export function useStore() { 
  return baseUseStore(key)
}
