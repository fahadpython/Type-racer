import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import http from "http";
import { Server } from "socket.io";

interface User {
  id: string;
  name: string;
  color: string;
  progress: number;
  wpm: number;
  accuracy: number;
  finished: boolean;
  place: number | null;
  isBot?: boolean;
  targetWpm?: number;
  errors?: number;
  timeSpent?: number;
}

interface Room {
  id: string;
  users: Record<string, User>;
  status: "waiting" | "countdown" | "racing" | "finished";
  phrase: string;
  startTime: number | null;
  finishersCount: number;
  bonusWords: string[];
  isPractice?: boolean;
}

const rooms: Record<string, Room> = {};

const DEFAULT_PHRASES = [
  "The quick brown fox jumps over the lazy dog.",
  "To be, or not to be, that is the question.",
  "All that glitters is not gold.",
  "A journey of a thousand miles begins with a single step.",
  "Houston, we have a problem.",
];

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = http.createServer(app);
  const io = new Server(httpServer, {
    cors: {
      origin: "*",
    },
  });

  io.on("connection", (socket) => {
    let currentRoomId: string | null = null;
    let currentUserId: string | null = null;

    socket.on("join_room", ({ roomId, user }: { roomId: string; user: { id: string; name: string; color: string } }) => {
      socket.join(roomId);
      currentRoomId = roomId;
      currentUserId = user.id;

      if (!rooms[roomId]) {
        rooms[roomId] = {
          id: roomId,
          users: {},
          status: "waiting",
          phrase: DEFAULT_PHRASES[Math.floor(Math.random() * DEFAULT_PHRASES.length)],
          startTime: null,
          finishersCount: 0,
          bonusWords: [],
          isPractice: false,
        };
      }

      rooms[roomId].users[user.id] = {
        ...user,
        progress: 0,
        wpm: 0,
        accuracy: 100,
        finished: false,
        place: null,
      };

      io.to(roomId).emit("room_state", rooms[roomId]);
    });

    socket.on("set_phrase", ({ roomId, phrase, bonusWords }: { roomId: string; phrase: string; bonusWords: string[] }) => {
      if (rooms[roomId] && rooms[roomId].status === "waiting") {
        rooms[roomId].phrase = phrase;
        if (bonusWords) rooms[roomId].bonusWords = bonusWords;
        io.to(roomId).emit("room_state", rooms[roomId]);
      }
    });

    socket.on("toggle_practice", ({ roomId, isPractice }: { roomId: string; isPractice: boolean }) => {
      if (rooms[roomId] && rooms[roomId].status === "waiting") {
        rooms[roomId].isPractice = isPractice;
        io.to(roomId).emit("room_state", rooms[roomId]);
      }
    });

    socket.on("add_bot", ({ roomId, speed, targetWpm }: { roomId: string, speed: string, targetWpm?: number }) => {
       if (rooms[roomId] && rooms[roomId].status === "waiting") {
           const botId = "bot_" + Math.random().toString(36).substr(2, 6);
           const wpm = targetWpm || (speed === "Easy" ? 30 : speed === "Medium" ? 70 : 120);
           rooms[roomId].users[botId] = {
               id: botId,
               name: `AI (${wpm}WPM)`,
               color: speed === "Easy" ? "#a1a1aa" : speed === "Medium" ? "#f59e0b" : "#ef4444",
               progress: 0,
               wpm: 0,
               accuracy: 100,
               finished: false,
               place: null,
               isBot: true,
               targetWpm: wpm,
               topSpeed: 0,
               worstLetter: ""
           };
           io.to(roomId).emit("room_state", rooms[roomId]);
       }
    });

    socket.on("remove_bot", ({ roomId, botId }: { roomId: string, botId: string }) => {
       if (rooms[roomId] && rooms[roomId].status === "waiting") {
           delete rooms[roomId].users[botId];
           io.to(roomId).emit("room_state", rooms[roomId]);
       }
    });

    socket.on("start_race", ({ roomId }: { roomId: string }) => {
      if (rooms[roomId] && rooms[roomId].status === "waiting") {
        rooms[roomId].status = "countdown";
        // Reset users
        Object.values(rooms[roomId].users).forEach((u) => {
          u.progress = 0;
          u.wpm = 0;
          u.accuracy = 100;
          u.finished = false;
          u.place = null;
          u.topSpeed = 0;
          u.worstLetter = "";
        });
        rooms[roomId].finishersCount = 0;
        
        io.to(roomId).emit("room_state", rooms[roomId]);
        
        // Simple countdown
        let count = 3;
        const interval = setInterval(() => {
          if (count > 0) {
            io.to(roomId).emit("countdown", count);
            count--;
          } else {
            clearInterval(interval);
            if (rooms[roomId]) {
                rooms[roomId].status = "racing";
                rooms[roomId].startTime = Date.now();
                io.to(roomId).emit("room_state", rooms[roomId]);
                io.to(roomId).emit("race_started", rooms[roomId].startTime);
            }
          }
        }, 1000);
      }
    });

    socket.on("progress_update", ({ roomId, userId, progress, wpm, accuracy, finished, errors, timeSpent, topSpeed, worstLetter }: { roomId: string; userId: string; progress: number; wpm: number; accuracy: number; finished: boolean; errors?: number; timeSpent?: number; topSpeed?: number; worstLetter?: string; }) => {
      if (rooms[roomId] && rooms[roomId].users[userId] && rooms[roomId].status === "racing") {
        const user = rooms[roomId].users[userId];
        user.progress = progress;
        user.wpm = wpm;
        user.accuracy = accuracy;
        if (errors !== undefined) user.errors = errors;
        if (timeSpent !== undefined) user.timeSpent = timeSpent;
        if (topSpeed !== undefined) user.topSpeed = Math.max(user.topSpeed || 0, topSpeed);
        if (worstLetter !== undefined) user.worstLetter = worstLetter;
        
        if (finished && !user.finished) {
          user.finished = true;
          rooms[roomId].finishersCount += 1;
          user.place = rooms[roomId].finishersCount;
        }
        
        io.to(roomId).emit("room_state", rooms[roomId]);

        // Check if everyone finished
        const allFinished = Object.values(rooms[roomId].users).every(u => u.finished);
        if (allFinished) {
          rooms[roomId].status = "finished";
          io.to(roomId).emit("room_state", rooms[roomId]);
        }
      }
    });

    socket.on("end_race", ({ roomId }: { roomId: string }) => {
       if (rooms[roomId] && rooms[roomId].status === "racing") {
           rooms[roomId].status = "finished";
           Object.values(rooms[roomId].users).forEach(u => {
               if (!u.finished) {
                   u.finished = true;
               }
           });
           io.to(roomId).emit("room_state", rooms[roomId]);
       }
    });

    socket.on("back_to_lobby", ({ roomId }: { roomId: string }) => {
       if (rooms[roomId]) {
          rooms[roomId].status = "waiting";
          rooms[roomId].finishersCount = 0;
          Object.values(rooms[roomId].users).forEach((u) => {
             u.progress = 0;
             u.wpm = 0;
             u.accuracy = 100;
             u.finished = false;
             u.place = null;
          });
          io.to(roomId).emit("room_state", rooms[roomId]);
       }
    });

    socket.on("disconnect", () => {
      if (currentRoomId && currentUserId && rooms[currentRoomId]) {
        delete rooms[currentRoomId].users[currentUserId];
        if (Object.keys(rooms[currentRoomId].users).length === 0) {
          delete rooms[currentRoomId];
        } else {
          io.to(currentRoomId).emit("room_state", rooms[currentRoomId]);
          
          // Checks if remaining players are all finished
          if (rooms[currentRoomId].status === "racing") {
              const allFinished = Object.values(rooms[currentRoomId].users).every(u => u.finished);
              if (allFinished && Object.keys(rooms[currentRoomId].users).length > 0) {
                 rooms[currentRoomId].status = "finished";
                 io.to(currentRoomId).emit("room_state", rooms[currentRoomId]);
              }
          }
        }
      }
    });
  });

  // Global bot update loop
  setInterval(() => {
     for (const roomId in rooms) {
        const room = rooms[roomId];
        if (room.status === "racing" && room.startTime) {
           let stateChanged = false;
           let allFinished = true;
           const timeElapsed = (Date.now() - room.startTime) / 60000;
           
           for (const userId in room.users) {
               const u = room.users[userId];
               if (u.isBot && !u.finished) {
                   const charsTyped = Math.floor((u.targetWpm || 30) * 5 * timeElapsed);
                   const progress = Math.min(100, (charsTyped / room.phrase.length) * 100);
                   
                   u.progress = progress;
                   u.wpm = u.targetWpm || 0;
                   u.topSpeed = u.wpm;
                   if (progress >= 100 && !u.finished) {
                       u.finished = true;
                       room.finishersCount++;
                       u.place = room.finishersCount;
                       u.timeSpent = Math.floor(timeElapsed * 60);
                       u.errors = Math.floor(Math.random() * 5); // Simulating bot errors
                   }
                   stateChanged = true;
               }
               if (!u.finished) allFinished = false;
           }

           if (stateChanged) {
               io.to(roomId).emit("room_state", room);
           }
           if (allFinished) {
               room.status = "finished";
               io.to(roomId).emit("room_state", room);
           }
        }
     }
  }, 1000);

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
