import { io } from "socket.io-client";

// Get the current host dynamically for both dev and prod
const host = window.location.protocol + "//" + window.location.host;
export const socket = io(host, {
  autoConnect: true,
});
