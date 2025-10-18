// src/App.js
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import store from "./redux/store";
import { router } from "./router";
import useUserWebSocket from "./hooks/useUserWebSocket"; // ← add this

export default function App() {
  useUserWebSocket(); // ← opens the per-user WS globally and handles force_logout

  return (
    <Provider store={store}>
      <RouterProvider
        router={router}
        future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
      />
    </Provider>
  );
}
