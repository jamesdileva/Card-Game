import { useState } from "react";
import SlotMachine from "./SlotMachine";
import Login from "./Login";

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);

  return loggedIn ? (
    <SlotMachine />
  ) : (
    <Login onLogin={() => setLoggedIn(true)} />
  );
}