import { Room } from "../types";
import { socket } from "../socket";
import { useEffect, useState, useRef, useMemo } from "react";
import { Car, Trophy, Flag, Gauge } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import clsx from "clsx";
import { FINGER_COLORS, FINGER_MAP } from "../utils/fingerMapping";

const Finger = ({ height, color, label, className = "" }: { height: string, color: string, label: string, className?: string }) => (
    <div className={`flex flex-col items-center gap-1 ${className}`}>
        <div className={`w-8 ${height} rounded-t-full border border-black/20 shadow-inner overflow-hidden`} style={{ backgroundColor: `${color}80`, borderTopColor: color }}>
            <div className="w-full h-2 bg-white/20 mt-1 rounded-full w-4 mx-auto"></div>
        </div>
        <div className="text-[9px] text-zinc-500 font-bold uppercase tracking-wider">{label}</div>
    </div>
);

interface Props {
  room: Room;
  currentUserId: string;
}

export default function RaceScreen({ room, currentUserId }: Props) {
  const phraseStr = room.phrase;
  const phraseChars = useMemo(() => room.phrase.split(""), [room.phrase]);
  
  // Create word map for bonus skipping
  // This maps character index to the word it belongs to, to easily check completions
  const phraseWords = useMemo(() => phraseStr.split(" "), [phraseStr]);
  const bonusWordsSet = useMemo(() => new Set((room.bonusWords || []).map(w => w.toLowerCase().replace(/[^a-z0-9]/g, ''))), [room.bonusWords]);

  const [typedChars, setTypedChars] = useState<string[]>([]);
  const [skippedCount, setSkippedCount] = useState(0); 
  const [wpm, setWpm] = useState(0);
  const [topSpeed, setTopSpeed] = useState(0);
  const [totalErrors, setTotalErrors] = useState(0);
  const mistypesRef = useRef<Record<string, number>>({});
  const totalStrokesRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playSound = (type: 'type' | 'error' | 'bonus' | 'finish') => {
      try {
          if (!audioCtxRef.current) {
              const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
              if (AudioContext) audioCtxRef.current = new AudioContext();
          }
          const ctx = audioCtxRef.current;
          if (!ctx) return;
          if (ctx.state === 'suspended') ctx.resume();
          
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          if (type === 'type') {
              osc.type = 'sine';
              osc.frequency.setValueAtTime(800 + Math.random()*200, ctx.currentTime);
              gain.gain.setValueAtTime(0.03, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.05);
          } else if (type === 'error') {
              osc.type = 'sawtooth';
              osc.frequency.setValueAtTime(150, ctx.currentTime);
              gain.gain.setValueAtTime(0.08, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.2);
          } else if (type === 'bonus') {
              osc.type = 'triangle';
              osc.frequency.setValueAtTime(600, ctx.currentTime);
              osc.frequency.setValueAtTime(800, ctx.currentTime + 0.1);
              gain.gain.setValueAtTime(0.05, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.3);
          } else if (type === 'finish') {
              osc.type = 'sine';
              osc.frequency.setValueAtTime(523.25, ctx.currentTime);
              osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.1);
              osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.2);
              osc.frequency.setValueAtTime(1046.50, ctx.currentTime + 0.3);
              gain.gain.setValueAtTime(0.1, ctx.currentTime);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
              osc.start(ctx.currentTime);
              osc.stop(ctx.currentTime + 0.6);
          }
      } catch(e) {}
  };
  
  const [recentCorrect, setRecentCorrect] = useState(false); // For BG animation
  const [combo, setCombo] = useState(0);
  const [bonusTriggered, setBonusTriggered] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  
  const currentUserObj = room.users[currentUserId];
  const isFinished = currentUserObj?.finished;

  useEffect(() => {
     const focusInput = () => inputRef.current?.focus();
     document.addEventListener("click", focusInput);
     focusInput();
     return () => document.removeEventListener("click", focusInput);
  }, []);

  useEffect(() => {
     if (isFinished) return;
     
     const interval = setInterval(() => {
        if (!room.startTime) return;
        const timeElapsedMin = (Date.now() - room.startTime) / 60000;
        if (timeElapsedMin > 0) {
            const actuallyTyped = Math.max(0, typedChars.length - skippedCount);
            const words = actuallyTyped / 5;
            const currentWpm = Math.round(words / timeElapsedMin);
            setWpm(currentWpm);
            setTopSpeed(prev => Math.max(prev, currentWpm));
            
            // Also notify server in case we stop typing
            if (!isFinished) {
               socket.emit("progress_update", {
                   roomId: room.id,
                   userId: currentUserId,
                   progress: Math.min(100, (typedChars.length / phraseChars.length) * 100),
                   wpm: currentWpm,
                   accuracy: currentUserObj?.accuracy || 100,
                   timeSpent: Math.floor((Date.now() - room.startTime) / 1000),
                   topSpeed: Math.max(topSpeed, currentWpm),
                   worstLetter: Object.entries(mistypesRef.current).sort((a,b)=>b[1]-a[1])[0]?.[0] || "",
                   finished: false,
               });
            }
        }
     }, 1000);
     return () => clearInterval(interval);
  }, [isFinished, room.startTime, typedChars.length, skippedCount]);

  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
         if (isFinished) return;
         if (e.key === "Escape" || e.metaKey || e.ctrlKey || e.altKey) return;
         
         if (e.key === "Backspace") {
             playSound('type');
             setTypedChars((prev) => prev.slice(0, -1));
             setCombo(0);
             return;
         }
         
         if (e.key.length === 1) {
             totalStrokesRef.current += 1;
             let newErrorCount = totalErrors;
             let newSkippedCount = skippedCount;
             
             setTypedChars((prev) => {
                const nextIndex = prev.length;
                if (nextIndex >= phraseChars.length) return prev;
                
                const expectedChar = phraseChars[nextIndex];
                const isCorrect = (e.key === expectedChar);
                
                if (!isCorrect && expectedChar !== " ") {
                    mistypesRef.current[expectedChar] = (mistypesRef.current[expectedChar] || 0) + 1;
                }

                if (!isCorrect) {
                    playSound('error');
                    newErrorCount++;
                    setTotalErrors(newErrorCount);
                    setCombo(0);
                    
                    const container = document.getElementById('typing-container');
                    if (container) {
                        container.classList.add('error-shake');
                        setTimeout(() => container.classList.remove('error-shake'), 300);
                    }
                } else {
                    playSound('type');
                    setRecentCorrect(true);
                    setCombo(c => c + 1);
                    setTimeout(() => setRecentCorrect(false), 200);
                }
                
                let newChars = [...prev, e.key];
                
                // --- BONUS WORD SKIPPING LOGIC ---
                // If the user just typed a space, or finished the text, we check what word they just completely finished matching.
                if (isCorrect && (e.key === " " || newChars.length === phraseChars.length)) {
                    // Extract the typed string so far
                    const currentTypedStr = newChars.join("");
                    // Check if it matches exactly the phrase prefix
                    if (currentTypedStr === phraseStr.substring(0, newChars.length)) {
                        // This means no pending errors up to here.
                        // Find the word just typed.
                        const wordsTyped = currentTypedStr.trimEnd().split(" ");
                        const lastWord = wordsTyped[wordsTyped.length - 1];
                        
                        const cleanLastWord = lastWord.toLowerCase().replace(/[^a-z0-9]/g, '');
                        if (cleanLastWord && bonusWordsSet.has(cleanLastWord)) {
                             // SUCCESS! Bonus word typed correctly!
                             // Find the next word in the phrase and skip it automatically.
                             const remainingPhrase = phraseStr.substring(newChars.length);
                             // Let's find the end of the next word.
                             const nextWordMatch = remainingPhrase.match(/^(\s*\S+)/);
                             if (nextWordMatch) {
                                 const nextWordStr = nextWordMatch[1];
                                 newChars = [...newChars, ...nextWordStr.split("")];
                                 newSkippedCount += nextWordStr.length;
                                 setSkippedCount(newSkippedCount);
                                 
                                 setBonusTriggered(cleanLastWord);
                                 playSound('bonus');
                                 setTimeout(() => setBonusTriggered(null), 1500);
                                 
                                 // Adding a satisfying bump to combo
                                 setCombo(c => c + 10);
                             }
                        }
                    }
                }
                // ---------------------------------
                
                setTimeout(() => {
                    let correctCount = 0;
                    let hasError = false;
                    for (let i = 0; i < newChars.length; i++) {
                        if (newChars[i] === phraseChars[i]) {
                             if (!hasError) correctCount++;
                        } else {
                            hasError = true;
                        }
                    }
                    
                    const progress = (correctCount / phraseChars.length) * 100;
                    const finished = correctCount === phraseChars.length;
                    
                    if (finished && !isFinished) {
                        playSound('finish');
                    }
                    
                    const calculatedAccuracy = Math.round(Math.max(0, (totalStrokesRef.current - newErrorCount) / Math.max(1, totalStrokesRef.current)) * 100);
                    
                    const timeElapsedMin = room.startTime ? (Date.now() - room.startTime) / 60000 : 0;
                    const actuallyTyped = Math.max(0, newChars.length - newSkippedCount);
                    let currentWpm = wpm;
                    if (timeElapsedMin > 0) {
                        currentWpm = Math.round((actuallyTyped / 5) / timeElapsedMin);
                        setWpm(currentWpm);
                        setTopSpeed(prev => Math.max(prev, currentWpm));
                    }
                    
                    let worstLetter = "";
                    let maxMistypes = 0;
                    for (const [char, count] of Object.entries(mistypesRef.current)) {
                        if (count > maxMistypes) {
                            maxMistypes = count;
                            worstLetter = char;
                        }
                    }

                    socket.emit("progress_update", {
                        roomId: room.id,
                        userId: currentUserId,
                        progress: Math.min(100, progress),
                        wpm: currentWpm,
                        accuracy: calculatedAccuracy,
                        errors: newErrorCount,
                        timeSpent: room.startTime ? Math.floor((Date.now() - room.startTime) / 1000) : 0,
                        topSpeed: Math.max(topSpeed, currentWpm),
                        worstLetter: worstLetter,
                        finished,
                    });
                }, 0);
                
                return newChars;
             });
         }
      };
      
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFinished, phraseChars, room.id, currentUserId, wpm, totalErrors, phraseStr, skippedCount, bonusWordsSet]);

  const sortedUsers = Object.values(room.users).sort((a, b) => b.progress - a.progress || (a.finished ? -1 : 1));

  // Visuals computation
  const hue = Math.min(120, wpm); // 0 (red) to 120 (green)
  
  return (
    <div className={clsx(
        "flex-1 flex flex-col pt-4 transition-colors duration-300",
        combo > 20 ? "bg-indigo-950/20" : combo > 10 ? "bg-blue-950/20" : ""
    )}>
    
      <AnimatePresence>
          {bonusTriggered && (
             <motion.div 
                 initial={{ opacity: 0, y: 20, scale: 0.8 }}
                 animate={{ opacity: 1, y: 0, scale: 1 }}
                 exit={{ opacity: 0, y: -20, scale: 1.2 }}
                 className="fixed top-1/4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
             >
                 <div className="bg-amber-500 text-zinc-950 font-bold uppercase tracking-widest px-6 py-2 rounded-full shadow-[0_0_40px_rgba(245,158,11,0.6)] text-xl border-4 border-yellow-300">
                     BONUS SPEED: WORD SKIPPED!
                 </div>
             </motion.div>
          )}
      </AnimatePresence>

      <div className="flex gap-6 mb-6 overflow-hidden">
          {/* Speedometer Widget */}
          <div className="w-1/3 max-w-[250px] bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl flex flex-col items-center justify-center shrink-0 hidden md:flex relative overflow-hidden">
             
              {/* Combo glow */}
              <div 
                 className="absolute inset-0 opacity-20 blur-2xl transition-all duration-300"
                 style={{ backgroundColor: `hsl(${hue}, 100%, 50%)`, transform: `scale(${1 + combo*0.01})` }}
              />
              
              <div className="relative w-32 h-16 overflow-hidden mb-2">
                 <div className="w-32 h-32 rounded-full border-8 border-t-transparent border-l-transparent border-r-transparent border-b-zinc-800 absolute bottom-0 shadow-inner"></div>
                 {/* Gauge arc using conic-gradient (simulate half circle) */}
                 <div className="w-32 h-32 rounded-full absolute bottom-0 opacity-20 border-8 border-t-transparent border-r-transparent border-l-transparent border-b-current" style={{ color: `hsl(${hue}, 100%, 50%)` }}></div>
                 
                 {/* Needle */}
                 <motion.div 
                     className="absolute bottom-0 left-1/2 w-1 bg-gradient-to-t from-zinc-100 to-red-500 origin-bottom rounded-full"
                     style={{ height: '30px', marginLeft: '-2px' }}
                     animate={{ rotate: Math.min(90, Math.max(-90, (wpm / 150) * 180 - 90)) }}
                     transition={{ type: "spring", stiffness: 50, damping: 10 }}
                 />
                 <div className="absolute bottom-[-6px] left-1/2 -translate-x-1/2 w-3 h-3 bg-zinc-200 rounded-full shadow border-2 border-zinc-800"></div>
              </div>
              
              <div className="flex flex-col items-center z-10">
                 <motion.div 
                    key={wpm} 
                    initial={{ scale: 1.2, color: '#fff' }} 
                    animate={{ scale: 1, color: `hsl(${hue}, 100%, 60%)` }} 
                    className="text-4xl font-bold font-mono tracking-tighter"
                 >
                     {wpm}
                 </motion.div>
                 <div className="text-zinc-500 font-bold uppercase tracking-widest text-[10px]">WPM</div>
              </div>
          </div>
          
          {/* Main Track Area */}
          <div className="flex-1 min-h-[250px] bg-zinc-900 border border-zinc-800 rounded-3xl p-6 flex flex-col gap-5 shadow-inner relative overflow-hidden">
               {room.isPractice ? (
                   <div className="flex-1 flex flex-col items-center justify-center p-2 pt-6 opacity-70 select-none">
                       <h3 className="text-zinc-500 font-bold uppercase tracking-widest text-xs mb-8">Optimal Hand Placement Guide</h3>
                       <div className="flex gap-12 sm:gap-20 md:gap-32 justify-center">
                           {/* Left Hand */}
                           <div className="relative">
                               <div className="flex items-end gap-1.5">
                                   <Finger height="h-10" color={FINGER_COLORS['Left Pinky']} label="Pinky" />
                                   <Finger height="h-14" color={FINGER_COLORS['Left Ring']} label="Ring" />
                                   <Finger height="h-16" color={FINGER_COLORS['Left Middle']} label="Mid" />
                                   <Finger height="h-14" color={FINGER_COLORS['Left Index']} label="Index" />
                                   <Finger height="h-10" color={FINGER_COLORS['Thumbs']} label="Thumb" className="ml-4 md:ml-8 -rotate-[30deg] origin-bottom-left" />
                               </div>
                           </div>
                           {/* Right Hand */}
                           <div className="relative">
                               <div className="flex items-end gap-1.5">
                                   <Finger height="h-10" color={FINGER_COLORS['Thumbs']} label="Thumb" className="mr-4 md:mr-8 rotate-[30deg] origin-bottom-right" />
                                   <Finger height="h-14" color={FINGER_COLORS['Right Index']} label="Index" />
                                   <Finger height="h-16" color={FINGER_COLORS['Right Middle']} label="Mid" />
                                   <Finger height="h-14" color={FINGER_COLORS['Right Ring']} label="Ring" />
                                   <Finger height="h-10" color={FINGER_COLORS['Right Pinky']} label="Pinky" />
                               </div>
                           </div>
                       </div>
                   </div>
               ) : (
                   sortedUsers.map((user, i) => (
                       <div key={user.id} className="relative h-12 border-b border-zinc-800/40 border-dashed last:border-0 flex items-center">
                           
                           <div className="absolute left-0 w-32 truncate text-sm font-bold text-zinc-500 pl-2">
                               {user.name} {user.id === currentUserId && "(You)"}
                           </div>
                           
                           <div className="absolute left-[130px] right-12 top-0 bottom-0">
                               <motion.div 
                                   className="absolute top-1/2 -translate-y-1/2 z-10 flex flex-col items-center pb-8"
                                   initial={{ left: "0%" }}
                                   animate={{ left: `${Math.min(100, user.progress)}%` }}
                                   transition={{ type: "spring", stiffness: 80, damping: 20 }}
                                   style={{ marginLeft: "-24px" }}
                               >
                                   <div className="bg-zinc-800/90 backdrop-blur text-[10px] uppercase font-bold text-zinc-300 px-2 py-0.5 rounded shadow-sm mb-1 border border-zinc-700 whitespace-nowrap">
                                       {user.finished ? 'Finish' : `${user.wpm} wpm`}
                                   </div>
                                   <div className="w-10 h-10 bg-zinc-950 rounded-xl border border-zinc-800 shadow-xl flex items-center justify-center relative overflow-hidden ring-1 ring-white/10 shrink-0 z-20">
                                       {user.finished && user.place === 1 && <Trophy className="absolute inset-0 w-full h-full p-2 text-yellow-500 opacity-30" />}
                                       <Car className="w-6 h-6" style={{ color: user.color, filter: `drop-shadow(0 0 10px ${user.color})` }} />
                                   </div>
                                   
                                   {/* Neon Trail */}
                                   {!user.finished && user.wpm > 0 && (
                                       <motion.div 
                                          className="absolute top-1/2 -translate-y-1/2 right-[50%] h-4 rounded-l-full blur-md opacity-60 z-0 origin-right"
                                          style={{ background: `linear-gradient(to right, transparent, ${user.color})` }}
                                          animate={{ width: Math.min(200, user.wpm * 2) }}
                                          transition={{ type: "spring" }}
                                       />
                                   )}
                               </motion.div>
                           </div>
                           
                           <div className="absolute right-0 w-8 flex items-center justify-center opacity-50 border-l border-zinc-800 h-full">
                               <Flag className="w-4 h-4 text-zinc-500" />
                           </div>
                       </div>
                   ))
               )}
          </div>
      </div>

      {/* Typing Area */}
      <motion.div 
         id="typing-container"
         className="relative p-6 sm:p-10 bg-zinc-900 shadow-2xl border border-zinc-800 rounded-3xl flex flex-col overflow-hidden"
         animate={{
            borderColor: recentCorrect ? 'rgba(74, 222, 128, 0.4)' : 'rgba(39, 39, 42, 1)',
            boxShadow: recentCorrect ? '0 0 30px rgba(74, 222, 128, 0.1)' : '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
         }}
         transition={{ duration: 0.1 }}
      >
          <div className="flex items-center justify-between mb-8 pb-4 border-b border-zinc-800/50">
              <div className="text-zinc-400 font-medium text-sm flex gap-4 sm:gap-6 items-center flex-wrap">
                  <span className="flex items-center gap-2"><Gauge className="w-4 h-4" /> <span className="text-blue-400 font-mono text-lg">{wpm} WPM</span></span>
                  <span className="flex items-center gap-1.5"><span className="text-zinc-500 text-xs uppercase uppercase">Errors:</span> <span className="text-red-400 font-mono text-lg">{totalErrors}</span></span>
                  <span className="flex items-center gap-1.5"><span className="text-zinc-500 text-xs uppercase uppercase">Combo:</span> <span className="text-amber-400 font-mono text-lg">{combo}x</span></span>
              </div>
              <button onClick={() => socket.emit("end_race", { roomId: room.id })} className="text-[10px] sm:text-xs bg-red-500/10 text-red-500 hover:bg-red-500/20 px-3 py-1.5 rounded uppercase font-bold tracking-wider shrink-0 transition-colors">
                  End Race
              </button>
          </div>
          
          <div className="font-mono text-2xl sm:text-3xl lg:text-[2.5rem] leading-[1.6] tracking-tight whitespace-pre-wrap select-none relative break-words">
              {phraseChars.map((char, index) => {
                  const typedChar = typedChars[index];
                  let statusClass = "text-zinc-600"; 
                  let scale = 1;
                  
                  if (typedChar !== undefined) {
                      if (typedChar === char) {
                          statusClass = "text-zinc-200 drop-shadow-[0_0_12px_rgba(255,255,255,0.4)]";
                      } else {
                          statusClass = "text-red-300 bg-red-500/20 rounded drop-shadow-[0_0_12px_rgba(239,68,68,0.6)] border border-red-500/40";
                      }
                  }
                  
                  const isCurrent = index === typedChars.length;
                  
                  let customStyle = {};
                  if (room.isPractice && isCurrent && !isFinished) {
                      const finger = FINGER_MAP[char] || 'Thumbs';
                      const fcolor = FINGER_COLORS[finger];
                      if (fcolor) {
                          customStyle = {
                              color: fcolor,
                              borderColor: fcolor,
                              backgroundColor: `${fcolor}20`,
                              textShadow: `0 0 10px ${fcolor}`
                          };
                      }
                  }

                  return (
                      <span key={index} className={clsx(
                          statusClass, 
                          isCurrent && !isFinished && "border-b-[3px] border-blue-500 animate-pulse relative z-10 bg-blue-500/10",
                          "transition-colors duration-150 inline-block rounded-sm"
                      )}
                      style={customStyle}>
                          {char === " " && isCurrent ? "\u00A0" : char}
                      </span>
                  );
              })}
          </div>
      </motion.div>
    </div>
  );
}
