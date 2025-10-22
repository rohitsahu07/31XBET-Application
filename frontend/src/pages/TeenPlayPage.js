import React from "react";
import TeenPlay from "../components/TeenPlay";

/**
 * TeenPlayPage
 * Receives setExpo from App.js to update the global Chips & Expo bar.
 * App.js (or your layout) should render <ChipsandExpo expo={expo} /> using the same state.
 */
const TeenPlayPage = ({ setExpo }) => {
  return <TeenPlay setExpo={setExpo} />;
};

export default TeenPlayPage;
