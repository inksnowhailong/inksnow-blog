import { Store } from "vuex";
declare module "@vue/runtime-core" {
  interface State {
    liPage: string;
  }
  interface ComponentCustomProperties {
    $store: Store<State>;
  }
}
