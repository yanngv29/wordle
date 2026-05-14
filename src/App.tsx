import React, { useState, useEffect, useCallback } from "react";
import { WORDS, getRandomWord } from "./words";
import "./index.css";

type Status = "correct" | "present" | "absent" | "empty";

const KEYBOARD_ROWS = [
  ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["ENTER", "W", "X", "C", "V", "B", "N", "DELETE"],
];

export function App() {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"PLAYING" | "WON" | "LOST">("PLAYING");
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [usedLetters, setUsedLetters] = useState<Record<string, Status>>({});

  // Initialize game
  useEffect(() => {
    startNewGame();
  }, []);

  const startNewGame = () => {
    setTargetWord(getRandomWord());
    setGuesses([]);
    setCurrentGuess("");
    setGameState("PLAYING");
    setMessage("");
    setUsedLetters({});
  };

  const getLetterStatuses = useCallback((guess: string, target: string): Status[] => {
    const statuses: Status[] = Array(5).fill("absent");
    const targetArr = target.split("");
    const guessArr = guess.split("");
    const usedIndices = new Set<number>();

    // First pass: find correct letters
    guessArr.forEach((char, i) => {
      if (char === targetArr[i]) {
        statuses[i] = "correct";
        usedIndices.add(i);
      }
    });

    // Second pass: find present letters
    guessArr.forEach((char, i) => {
      if (statuses[i] !== "correct") {
        const targetIndex = targetArr.findIndex((c, idx) => c === char && !usedIndices.has(idx));
        if (targetIndex !== -1) {
          statuses[i] = "present";
          usedIndices.add(targetIndex);
        }
      }
    });

    return statuses;
  }, []);

  const updateUsedLetters = (guess: string, statuses: Status[]) => {
    const newUsedLetters = { ...usedLetters };
    guess.split("").forEach((char, i) => {
      const currentStatus = newUsedLetters[char];
      const newStatus = statuses[i];

      // Priority: correct > present > absent
      if (!currentStatus || (newStatus === "correct") || (newStatus === "present" && currentStatus === "absent")) {
        newUsedLetters[char] = newStatus;
      }
    });
    setUsedLetters(newUsedLetters);
  };

  const handleKeyPress = useCallback((key: string) => {
    if (gameState !== "PLAYING") return;

    if (key === "ENTER" || key === "Enter") {
      if (currentGuess.length < 5) {
        setMessage("Trop court");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      if (!WORDS.includes(currentGuess)) {
        setMessage("Pas dans la liste");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      const statuses = getLetterStatuses(currentGuess, targetWord);
      const newGuesses = [...guesses, currentGuess];
      setGuesses(newGuesses);
      updateUsedLetters(currentGuess, statuses);
      setCurrentGuess("");

      if (currentGuess === targetWord) {
        setGameState("WON");
        setMessage("Félicitations !");
      } else if (newGuesses.length === 6) {
        setGameState("LOST");
        setMessage(`Perdu ! Le mot était : ${targetWord}`);
      }
    } else if (key === "DELETE" || key === "Backspace") {
      setCurrentGuess(prev => prev.slice(0, -1));
      setMessage("");
    } else {
      const normalizedKey = key.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
      if (/^[A-Z]$/.test(normalizedKey) && currentGuess.length < 5) {
        setCurrentGuess(prev => prev + normalizedKey);
        setMessage("");
      }
    }
  }, [currentGuess, gameState, guesses, targetWord, getLetterStatuses, usedLetters]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyPress(e.key);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleKeyPress]);

  const renderTile = (char: string, status: Status, index: number, isAnimating: boolean) => {
    const delay = index * 100;
    return (
      <div
        key={index}
        className={`tile ${char ? "filled" : ""} ${status} ${isAnimating ? "animate-flip" : ""} ${char && !status ? "animate-bounce-in" : ""}`}
        style={isAnimating ? { animationDelay: `${delay}ms` } : {}}
      >
        {char}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 max-w-md mx-auto relative">
      <header className="w-full border-b border-gray-700 py-4 mb-8 text-center">
        <h1 className="text-4xl font-black tracking-widest">LE MOT</h1>
      </header>

      <main className="flex-1 w-full flex flex-col items-center justify-center gap-2">
        {/* Grid */}
        <div className={`grid grid-rows-6 gap-1 w-full max-w-[350px] ${shake ? "animate-shake" : ""}`}>
          {[...Array(6)].map((_, rowIndex) => {
            const guess = guesses[rowIndex];
            const isCurrentRow = rowIndex === guesses.length;
            const content = isCurrentRow ? currentGuess : guess || "";
            
            return (
              <div key={rowIndex} className="grid grid-cols-5 gap-1">
                {[...Array(5)].map((_, colIndex) => {
                  const char = content[colIndex] || "";
                  let status: Status = "empty";
                  if (guess) {
                    status = getLetterStatuses(guess, targetWord)[colIndex];
                  }
                  return renderTile(char, status, colIndex, !!guess);
                })}
              </div>
            );
          })}
        </div>

        {/* Message */}
        <div className="h-12 flex items-center justify-center">
          {message && (
            <div className="bg-white text-black px-4 py-2 rounded-md font-bold shadow-lg">
              {message}
            </div>
          )}
        </div>
      </main>

      {/* Keyboard */}
      <footer className="w-full max-w-[500px] mt-8">
        <div className="flex flex-col gap-2">
          {KEYBOARD_ROWS.map((row, i) => (
            <div key={i} className="flex gap-1.5 justify-center">
              {row.map(key => {
                const status = usedLetters[key] || "";
                return (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={`key ${key.length > 1 ? "wide text-xs" : ""} ${status}`}
                  >
                    {key === "DELETE" ? "⌫" : key}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </footer>

      {/* Game End Modal */}
      {gameState !== "PLAYING" && (
        <div className="fixed inset-0 modal-overlay flex items-center justify-center z-50">
          <div className="bg-[#121213] border border-gray-700 p-8 rounded-xl shadow-2xl text-center max-w-sm w-full animate-bounce-in">
            <h2 className="text-3xl font-bold mb-4">
              {gameState === "WON" ? "Bravo !" : "Dommage..."}
            </h2>
            <p className="text-gray-400 mb-6">
              {gameState === "WON" 
                ? `Vous avez trouvé le mot en ${guesses.length} ${guesses.length > 1 ? "essais" : "essai"}.` 
                : `Le mot à deviner était : ${targetWord}`}
            </p>
            <button
              onClick={startNewGame}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full transition-colors text-lg"
            >
              Nouvelle Partie
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
