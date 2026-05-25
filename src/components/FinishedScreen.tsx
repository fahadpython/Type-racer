import { Room } from "../types";
import { Trophy, RefreshCcw, Medal, Timer, Target, AlertCircle, Clock, Lightbulb } from "lucide-react";
import clsx from "clsx";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";
import { FINGER_MAP } from "../utils/fingerMapping";

interface Props {
  room: Room;
  currentUserId: string;
  onBackToLobby: () => void;
}

export default function FinishedScreen({ room, currentUserId, onBackToLobby }: Props) {
  const sortedUsers = Object.values(room.users).sort((a, b) => {
     if (a.place !== null && b.place !== null) return a.place - b.place;
     if (a.place !== null) return -1;
     if (b.place !== null) return 1;
     return b.progress - a.progress;
  });

  const currentUser = room.users[currentUserId];
  const worstChar = currentUser?.worstLetter;
  const recommendedFinger = worstChar ? FINGER_MAP[worstChar] : null;

  useEffect(() => {
     if (currentUser?.place === 1) {
         const duration = 3 * 1000;
         const animationEnd = Date.now() + duration;
         const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
         
         const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;
         
         const interval: any = setInterval(function() {
             const timeLeft = animationEnd - Date.now();
             
             if (timeLeft <= 0) {
                 return clearInterval(interval);
             }
             
             const particleCount = 50 * (timeLeft / duration);
             confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
             confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
         }, 250);
         
         return () => clearInterval(interval);
     }
  }, [currentUser?.place]);

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex-1 flex flex-col items-center justify-center space-y-8"
    >
       
       <div className="w-full max-w-4xl flex flex-col md:flex-row gap-6">
           
           <div className="flex-1 bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center relative overflow-hidden">
               <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 to-indigo-500"></div>
               {currentUser?.place === 1 ? (
                   <Trophy className="w-16 h-16 text-yellow-500 mb-6 drop-shadow-[0_0_15px_rgba(234,179,8,0.4)]" />
               ) : (
                   <Medal className="w-16 h-16 text-zinc-400 mb-6 drop-shadow-[0_0_15px_rgba(161,161,170,0.4)]" />
               )}
               <h2 className="text-3xl font-bold mb-2">{currentUser?.place === 1 ? 'Victory!' : 'Race Finished!'}</h2>
               <p className="text-zinc-400 mb-8">You placed {currentUser?.place ? <span className="text-zinc-100 font-bold px-2 py-1 bg-zinc-800 rounded">No. {currentUser.place}</span> : 'DNF'}</p>
               
               <div className="grid grid-cols-2 gap-4 w-full mb-4">
                   <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-inner relative overflow-hidden">
                       <Timer className="w-5 h-5 text-blue-400 mb-1 relative z-10" />
                       <div className="text-3xl font-bold font-mono text-zinc-100 relative z-10">{currentUser?.wpm}</div>
                       <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider relative z-10">WPM / Speed</div>
                       {currentUser?.topSpeed && currentUser.topSpeed > currentUser.wpm && (
                           <div className="absolute top-2 right-2 text-[10px] font-mono text-blue-500 font-bold opacity-50 block text-right">TOP<br/>{currentUser.topSpeed}</div>
                       )}
                   </div>
                   <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-inner">
                       <Target className="w-5 h-5 text-green-400 mb-1" />
                       <div className="text-3xl font-bold font-mono text-zinc-100">{currentUser?.accuracy || 100}%</div>
                       <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Accuracy</div>
                   </div>
               </div>
               
               <div className="grid grid-cols-2 gap-4 w-full">
                   <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-inner">
                       <AlertCircle className="w-4 h-4 text-red-400 mb-1" />
                       <div className="text-xl font-bold font-mono text-zinc-300">{currentUser?.errors || 0}</div>
                       <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Mistakes</div>
                   </div>
                   <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4 flex flex-col items-center gap-1 shadow-inner">
                       <Clock className="w-4 h-4 text-purple-400 mb-1" />
                       <div className="text-xl font-bold font-mono text-zinc-300">{currentUser?.timeSpent || 0}s</div>
                       <div className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Time Taken</div>
                   </div>
               </div>
               
               {worstChar && (
                   <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 w-full p-5 bg-red-500/10 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row gap-4 text-left items-start sm:items-center">
                       <div className="w-12 h-12 bg-red-500/20 rounded-xl flex items-center justify-center shrink-0 border border-red-500/30">
                           <Lightbulb className="w-6 h-6 text-red-400" />
                       </div>
                       <div>
                           <div className="text-red-400 font-bold mb-1 uppercase tracking-wider text-xs">Improvement Suggestion</div>
                           <div className="text-zinc-300 text-sm leading-relaxed">
                               You struggled most with the character <strong className="text-white bg-zinc-800 px-2 py-0.5 rounded shadow mx-1 font-mono">{worstChar}</strong>. 
                               {recommendedFinger && (
                                   <span> Build better muscle memory by practicing with your <strong className="text-red-300 font-bold">{recommendedFinger}</strong>.</span>
                               )}
                           </div>
                       </div>
                   </motion.div>
               )}
           </div>

           <div className="flex-[1.2] bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl flex flex-col">
               <h3 className="text-lg font-bold mb-6 flex items-center gap-2 border-b border-zinc-800 pb-4">
                  <Medal className="w-5 h-5 text-indigo-400" /> Match Results
               </h3>
               
               <div className="space-y-3 overflow-y-auto max-h-[400px] pr-2">
                   {sortedUsers.map((u, i) => (
                       <div key={u.id} className={clsx(
                           "flex items-center gap-4 p-4 rounded-2xl border transition-colors",
                           u.id === currentUserId ? "bg-zinc-800 border-zinc-700 shadow-md" : "bg-zinc-950/50 border-zinc-800/50"
                       )}>
                           <div className={clsx(
                               "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-sm",
                               u.place === 1 ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                               u.place === 2 ? "bg-zinc-300/10 text-zinc-300 border-zinc-300/20" :
                               u.place === 3 ? "bg-amber-700/10 text-amber-500 border-amber-500/20" : "bg-zinc-900 text-zinc-600 border-zinc-800"
                           )}>
                               {u.place || '-'}
                           </div>
                           <div className="flex-1">
                               <div className="font-bold flex items-center gap-2 text-zinc-200">
                                  {u.name} 
                                  {u.id === currentUserId && <span className="text-[10px] bg-blue-500/20 border border-blue-500/30 px-2 py-0.5 rounded text-blue-400 font-bold uppercase tracking-wider">You</span>}
                                  {u.isBot && <span className="text-[10px] bg-zinc-700 border border-zinc-600 px-2 py-0.5 rounded text-zinc-300 font-bold uppercase tracking-wider">AI</span>}
                               </div>
                               <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono mt-1 w-full">
                                  {u.finished ? (
                                     <>
                                        <span className="text-blue-400 font-bold">{u.wpm} WPM</span>
                                        {u.topSpeed !== undefined && u.topSpeed > u.wpm && <span className="text-blue-500/60 font-bold">(Top: {u.topSpeed})</span>}
                                        <span className="text-green-400">{u.accuracy}% ACC</span>
                                        <span className="text-zinc-500">{u.timeSpent}s</span>
                                     </>
                                  ) : (
                                     <span className="text-zinc-500">{Math.round(u.progress)}% COMPLETE</span>
                                  )}
                               </div>
                           </div>
                       </div>
                   ))}
               </div>
           </div>
       </div>

       <button 
           onClick={onBackToLobby}
           className="mt-8 px-10 py-4 bg-zinc-100 hover:bg-white text-zinc-900 rounded-2xl font-bold tracking-wide transition-all active:scale-95 flex items-center gap-3 border shadow-[0_0_20px_rgba(255,255,255,0.1)]"
       >
           <RefreshCcw className="w-5 h-5 bg-zinc-900 shrink-0 p-0.5 rounded-full text-zinc-100" /> Play Again
       </button>
    </motion.div>
  );
}
