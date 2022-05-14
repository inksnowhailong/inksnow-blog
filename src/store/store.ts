import { InjectionKey } from "vue";
import { createStore, Store,useStore as baseUseStore } from "vuex";

export interface State{
  // 写入state中的属性的类型
}
export const key:InjectionKey<Store<State>> = Symbol()

export const store = createStore<State>({
  state() {
    return {
      
    };
  },
  mutations: {
  
  },
});
export function useStore() { 
  return baseUseStore(key)
}
