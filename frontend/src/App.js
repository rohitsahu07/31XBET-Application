// src/App.js
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import store from "./redux/store";
import { router } from "./router";

export default function App() {
  return (
    <Provider store={store}>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      />
    </Provider>
  );
}
