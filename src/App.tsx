import { useState, useEffect } from "react";
import { v4 as uuidv4 } from "uuid";
import { socket } from "./socket";
import { Room, User } from "./types";
import JoinScreen from "./components/JoinScreen";
import LobbyScreen from "./components/LobbyScreen";
import RaceScreen from "./components/RaceScreen";
import FinishedScreen from "./components/FinishedScreen";

export default function App() {
  const [roomId, setRoomId] = useState<string>("");
  const [user, setUser] = useState<{ id: string; name: string; color: string } | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [connectionError, setConnectionError] = useState(false);

  useEffect(() => {
    // Check URL for room
    const urlParams = new URLSearchParams(window.location.search);
    let rId = urlParams.get("room");
    if (!rId) {
      rId = uuidv4().slice(0, 8);
      // Don't modify history to prevent loop if they change it
      window.history.replaceState({}, "", `?room=${rId}`);
    }
    setRoomId(rId);

    // Load user from local storage
    const storedUser = localStorage.getItem("typer_user");
    if (storedUser) {
      try {
        const parsedNode = JSON.parse(storedUser);
        if (parsedNode && parsedNode.id && parsedNode.name) {
          setUser(parsedNode);
        }
      } catch (e) {
        // Ignored
      }
    } else {
        const newUserId = uuidv4();
        setUser({ id: newUserId, name: "", color: "#3b82f6" });
    }

    socket.on("connect_error", () => setConnectionError(true));
    socket.on("connect", () => setConnectionError(false));

    socket.on("room_state", (updatedRoom: Room) => {
      setRoom(updatedRoom);
    });

    socket.on("countdown", (count: number) => {
      setCountdown(count);
    });

    return () => {
      socket.off("connect_error");
      socket.off("connect");
      socket.off("room_state");
      socket.off("countdown");
    };
  }, []);

  const handleJoin = (name: string, color: string) => {
    if (!user) return;
    const updatedUser = { ...user, name, color };
    setUser(updatedUser);
    localStorage.setItem("typer_user", JSON.stringify(updatedUser));
    
    socket.emit("join_room", { roomId, user: updatedUser });
  };

  const handleSetPhrase = (phrase: string, bonusWords: string[]) => {
      socket.emit("set_phrase", { roomId, phrase, bonusWords });
  };

  const handleAddBot = (speed: string, targetWpm?: number) => {
      socket.emit("add_bot", { roomId, speed, targetWpm });
  };
  
  const handleRemoveBot = (botId: string) => {
      socket.emit("remove_bot", { roomId, botId });
  };

  const handleTogglePractice = (isPractice: boolean) => {
      socket.emit("toggle_practice", { roomId, isPractice });
  };

  const handleStartRace = () => {
      socket.emit("start_race", { roomId });
  };
  
  const handleBackToLobby = () => {
      socket.emit("back_to_lobby", { roomId });
  };
  
  const copyLink = () => {
      navigator.clipboard.writeText(window.location.href);
  };

  if (!user || user.name === "" || !room) {
      return (
          <JoinScreen 
             roomId={roomId} 
             initialName={user?.name || ""} 
             initialColor={user?.color || "#3b82f6"} 
             onJoin={handleJoin} 
          />
      );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-blue-500/30">
        {connectionError && (
            <div className="bg-red-500/20 text-red-500 p-2 text-center text-sm font-medium">
                Disconnected from server. Retrying...
            </div>
        )}
        
        <main className="max-w-5xl mx-auto p-4 md:p-8 flex flex-col min-h-screen">
          <header className="flex items-center justify-between py-6 border-b border-zinc-800 mb-8 shrink-0">
              <h1 className="text-2xl font-bold tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-500 text-transparent bg-clip-text">
                 TypeRacer<span className="text-zinc-500">.</span>
              </h1>
              <div className="flex items-center gap-4">
                  <div className="text-sm font-medium text-zinc-400 font-mono">ROOM: {roomId}</div>
                  <button 
                      onClick={copyLink}
                      className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-md text-sm font-medium hover:bg-zinc-800 transition-colors"
                  >
                      Copy Invite Link
                  </button>
              </div>
          </header>

          <div className="flex-1 flex flex-col">
             {room.status === "waiting" && (
                 <LobbyScreen 
                    room={room} 
                    currentUserId={user.id} 
                    onStart={handleStartRace} 
                    onPhraseChange={handleSetPhrase}
                    onAddBot={handleAddBot}
                    onRemoveBot={handleRemoveBot}
                    onTogglePractice={handleTogglePractice}
                 />
             )}
             
             {room.status === "countdown" && (
                 <div className="flex-1 flex items-center justify-center">
                     <div className="text-[12rem] font-bold text-blue-500 animate-pulse drop-shadow-2xl font-mono tracking-tighter">
                         {countdown}
                     </div>
                 </div>
             )}
             
             {room.status === "racing" && (
                 <RaceScreen room={room} currentUserId={user.id} />
             )}
             
             {room.status === "finished" && (
                 <FinishedScreen room={room} currentUserId={user.id} onBackToLobby={handleBackToLobby} />
             )}
          </div>
        </main>
    </div>
  );
}
