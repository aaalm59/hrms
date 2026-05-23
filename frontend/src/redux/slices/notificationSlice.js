import { createSlice } from "@reduxjs/toolkit";

const initialState = {
  items: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    setNotifications(state, { payload }) {
      state.items = payload;
      state.unreadCount = payload.filter((n) => !n.is_read).length;
    },
    addNotification(state, { payload }) {
      state.items.unshift(payload);
      if (!payload.is_read) state.unreadCount += 1;
    },
    markRead(state, { payload: id }) {
      const n = state.items.find((n) => n.id === id);
      if (n && !n.is_read) {
        n.is_read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllRead(state) {
      state.items.forEach((n) => (n.is_read = true));
      state.unreadCount = 0;
    },
    setUnreadCount(state, { payload }) {
      state.unreadCount = payload;
    },
  },
});

export const { setNotifications, addNotification, markRead, markAllRead, setUnreadCount } = notificationSlice.actions;

export default notificationSlice.reducer;
