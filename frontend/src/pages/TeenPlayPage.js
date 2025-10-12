// src/pages/TeenPlayPage.js
import React from "react";
import TeenPlay from "../components/TeenPlay";

/**
 * TeenPlayPage
 * Receives setExpo from App.js to update the global Chips & Expo bar
 */
const TeenPlayPage = ({ setExpo }) => {
  return <TeenPlay setExpo={setExpo} />;
};

export default TeenPlayPage;
