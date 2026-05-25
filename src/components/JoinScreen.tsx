import { useState } from "react";
import { Keyboard, Car } from "lucide-react";

interface Props {
  roomId: string;
  initialName: string;
  initialColor: string;
  onJoin: (name: string, color: string) => void;
}

const COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#06b6d4", "#3b82f6", "#6366f1", "#a855f7", "#ec4899"
];

export default function JoinScreen({ roomId, initialName, initialColor, onJoin }: Props) {
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState(initialColor);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim().length > 0) {
      onJoin(name.trim(), color);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md p-8 rounded-2xl border border-zinc-800 bg-zinc-900/50 backdrop-blur-sm shadow-2xl">
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 bg-blue-500/10 rounded-2xl flex items-center justify-center mb-6 ring-1 ring-blue-500/20">
             <Keyboard className="w-8 h-8 text-blue-500" />
          </div>
          <h1 className="text-3xl font-bold tracking-tighter text-zinc-100 mb-2">Join Race</h1>
          <p className="text-zinc-400">Room: <span className="font-mono text-zinc-300 bg-zinc-800 px-2 rounded">{roomId}</span></p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium text-zinc-300">Racer Name</label>
            <input
              id="name"
              type="text"
              required
              autoFocus
              maxLength={15}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-zinc-950 border border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all font-medium text-zinc-100"
              placeholder="e.g. Speedster99"
            />
          </div>

          <div className="space-y-3">
             <label className="text-sm font-medium text-zinc-300">Car Color</label>
             <div className="grid grid-cols-5 gap-3">
                {COLORS.map((c) => (
                   <button
                     key={c}
                     type="button"
                     onClick={() => setColor(c)}
                     className={`w-full aspect-square rounded-xl border flex items-center justify-center transition-all ${color === c ? 'border-zinc-300 bg-zinc-800 scale-105' : 'border-zinc-800 hover:bg-zinc-800/50 hover:scale-105'}`}
                   >
                       <Car className="w-5 h-5" style={{ color: c }} />
                   </button>
                ))}
             </div>
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          >
            Enter Lobby
          </button>
        </form>
      </div>
    </div>
  );
}
