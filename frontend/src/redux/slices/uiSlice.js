import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  sidebarOpen: true,
  darkMode: localStorage.getItem("hrms_dark_mode") === "true",
  pageTitle: "HRMS",
};

const uiSlice = createSlice({
  name: "ui",
  initialState,
  reducers: {
    toggleSidebar(state) {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen(state, { payload }) {
      state.sidebarOpen = payload;
    },
    toggleDarkMode(state) {
      state.darkMode = !state.darkMode;
      localStorage.setItem("hrms_dark_mode", state.darkMode);
      document.documentElement.classList.toggle("dark", state.darkMode);
    },
    setPageTitle(state, { payload }) {
      state.pageTitle = payload;
      document.title = `${payload} | HRMS`;
    },
  },
});

export const { toggleSidebar, setSidebarOpen, toggleDarkMode, setPageTitle } = uiSlice.actions;
export default uiSlice.reducer;
