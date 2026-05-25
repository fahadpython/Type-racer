import { Room } from "../types";
import { Users, Car, Flag, Info, Bot, UserMinus, Plus } from "lucide-react";
import { useState } from "react";
import { motion } from "motion/react";

interface Props {
  room: Room;
  currentUserId: string;
  onStart: () => void;
  onPhraseChange: (phrase: string, bonusWords: string[]) => void;
  onAddBot: (speed: string, targetWpm?: number) => void;
  onRemoveBot: (botId: string) => void;
  onTogglePractice: (isPractice: boolean) => void;
}

export default function LobbyScreen({ room, currentUserId, onStart, onPhraseChange, onAddBot, onRemoveBot, onTogglePractice }: Props) {
  const [isEditingPhrase, setIsEditingPhrase] = useState(false);
  const [localPhrase, setLocalPhrase] = useState(room.phrase);
  const [localBonus, setLocalBonus] = useState(room.bonusWords?.join(", ") || "");
  const [showBotMenu, setShowBotMenu] = useState(false);
  const [customWpm, setCustomWpm] = useState<number>(100);
  
  const usersArray = Object.values(room.users);

  const handlePhraseSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (localPhrase.trim().length > 5) {
          const bw = localBonus.split(",").map(s => s.trim()).filter(Boolean);
          onPhraseChange(localPhrase.trim(), bw);
          setIsEditingPhrase(false);
      }
  };

  return (
    <motion.div 
       initial={{ opacity: 0 }}
       animate={{ opacity: 1 }}
       className="flex-1 flex flex-col items-center justify-center space-y-8"
    >
      
      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
         <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-medium flex items-center gap-2">
               <Users className="w-5 h-5 text-blue-500" /> Wait for Racers
            </h2>
            <div className="flex items-center gap-3">
                <div className="relative">
                    <button onClick={() => setShowBotMenu(!showBotMenu)} className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors border border-zinc-700">
                        <Bot className="w-4 h-4" /> Add AI
                    </button>
                    {showBotMenu && (
                        <div className="absolute top-full mt-2 right-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden z-10 w-48 flex flex-col p-2 gap-1">
                            <button onClick={() => { onAddBot("Easy"); setShowBotMenu(false) }} className="w-full text-left px-3 py-1.5 text-sm rounded bg-zinc-900/50 text-zinc-300 hover:bg-zinc-700 transition">Easy (30 WPM)</button>
                            <button onClick={() => { onAddBot("Medium"); setShowBotMenu(false) }} className="w-full text-left px-3 py-1.5 text-sm rounded bg-zinc-900/50 text-amber-500 hover:bg-zinc-700 transition">Medium (70 WPM)</button>
                            <button onClick={() => { onAddBot("Hard"); setShowBotMenu(false) }} className="w-full text-left px-3 py-1.5 text-sm rounded bg-zinc-900/50 text-red-500 hover:bg-zinc-700 transition">Hard (120 WPM)</button>
                            
                            <div className="border-t border-zinc-700 mt-1 pt-2">
                                <div className="text-xs text-zinc-500 mb-1 px-1">Custom Speed:</div>
                                <div className="flex gap-1">
                                    <input type="number" min={10} max={300} value={customWpm} onChange={(e) => setCustomWpm(Number(e.target.value))} className="w-16 px-2 py-1 text-xs bg-zinc-950 border border-zinc-700 rounded text-zinc-200" />
                                    <button onClick={() => { onAddBot("Custom", customWpm); setShowBotMenu(false) }} className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded text-xs px-2 font-medium">Add</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <div className="text-zinc-500 text-sm hidden sm:block">{usersArray.length} Player(s) Ready</div>
            </div>
         </div>
         <div className="p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
               {usersArray.map((user) => (
                   <div key={user.id} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950 border border-zinc-800/50 group relative">
                       <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0">
                          <Car className="w-5 h-5" style={{ color: user.color }} />
                       </div>
                       <div className="min-w-0 pr-4">
                           <span className="font-medium text-sm text-zinc-300 block truncate">
                              {user.name} 
                           </span>
                           {user.id === currentUserId && <span className="text-xs text-zinc-500 block">You</span>}
                           {user.isBot && <span className="text-xs text-blue-500 block font-mono bg-blue-500/10 px-1 rounded inline-block mt-0.5">{user.targetWpm} WPM</span>}
                       </div>
                       {user.isBot && (
                           <button onClick={() => onRemoveBot(user.id)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all">
                               <UserMinus className="w-4 h-4" />
                           </button>
                       )}
                   </div>
               ))}
               
               {/* Empty slots */}
               {Array.from({ length: Math.max(0, 4 - usersArray.length) }).map((_, i) => (
                   <div key={`empty-${i}`} className="flex items-center gap-3 p-3 rounded-xl bg-zinc-950/30 border border-zinc-800/30 border-dashed">
                       <div className="w-10 h-10 rounded-lg bg-zinc-900/50 flex items-center justify-center border border-zinc-800/50">
                       </div>
                       <span className="font-medium text-sm text-zinc-600">Waiting...</span>
                   </div>
               ))}
            </div>
         </div>
      </div>

      <div className="w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
         <div className="p-6">
            <div className="flex items-center justify-between mb-4">
               <h3 className="text-sm font-medium text-zinc-400 uppercase tracking-wider">Race Settings</h3>
               {!isEditingPhrase && (
                  <button onClick={() => { setIsEditingPhrase(true); setLocalPhrase(room.phrase); setLocalBonus(room.bonusWords?.join(", ") || ""); }} className="text-blue-500 text-sm hover:underline font-medium">Edit Phrase & Bonus Words</button>
               )}
            </div>
            
            {isEditingPhrase ? (
                <form onSubmit={handlePhraseSubmit} className="flex flex-col gap-4">
                   <div>
                       <label className="text-xs font-medium text-zinc-500 mb-1 block">Sentence to type</label>
                       <input 
                          type="text" 
                          value={localPhrase} 
                          onChange={e => setLocalPhrase(e.target.value)} 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                          autoFocus
                          required
                          minLength={10}
                       />
                   </div>
                   <div>
                       <label className="text-xs font-medium text-zinc-500 mb-1 block">Bonus Words (comma separated) - Typing these will skip the next word!</label>
                       <input 
                          type="text" 
                          value={localBonus} 
                          onChange={e => setLocalBonus(e.target.value)} 
                          className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-4 py-2 font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-amber-500" 
                          placeholder="e.g. quick, lazy"
                       />
                   </div>
                   <div className="flex justify-end gap-2">
                       <button type="button" onClick={() => setIsEditingPhrase(false)} className="px-4 py-2 bg-transparent text-zinc-400 hover:text-zinc-200 rounded-lg font-medium text-sm transition-colors">Cancel</button>
                       <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-colors shadow">Save</button>
                   </div>
                </form>
            ) : (
                <div className="space-y-4">
                   <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl font-mono text-lg text-zinc-300 leading-relaxed shadow-inner">
                      {room.phrase}
                   </div>
                   {room.bonusWords && room.bonusWords.length > 0 && (
                       <div className="flex items-center gap-2 text-sm">
                           <span className="text-amber-500 font-medium">Bonus Words:</span>
                           {room.bonusWords.map((w, i) => (
                               <span key={i} className="bg-amber-500/10 text-amber-500 px-2 py-0.5 rounded border border-amber-500/20 font-mono text-xs">{w}</span>
                           ))}
                       </div>
                   )}
                   <div className="flex items-center gap-3 mt-4 text-sm text-zinc-300 bg-zinc-950/50 p-3 rounded-lg border border-zinc-800/50">
                       <input type="checkbox" id="practice" checked={!!room.isPractice} onChange={(e) => onTogglePractice(e.target.checked)} className="rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-zinc-900 w-4 h-4 cursor-pointer" />
                       <label htmlFor="practice" className="cursor-pointer font-medium select-none flex-1">Enable Practice Mode (Finger guides & mistype tracking)</label>
                   </div>
                </div>
            )}
         </div>
      </div>
      
      <button 
         onClick={onStart}
         disabled={usersArray.length === 0}
         className="mt-8 px-12 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-2xl text-xl font-bold tracking-wide shadow-[0_0_40px_rgba(59,130,246,0.3)] transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
      >
         <Flag className="w-6 h-6" /> Start Race
      </button>

    </motion.div>
  );
}
