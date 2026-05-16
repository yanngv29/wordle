import React, { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./index.css";

type Status = "correct" | "present" | "absent" | "empty";
type Language = "fr" | "en";

interface AppProps {
  language: Language;
}

const KEYBOARD_ROWS_FR = [
  ["A", "Z", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["Q", "S", "D", "F", "G", "H", "J", "K", "L", "M"],
  ["ENTER", "W", "X", "C", "V", "B", "N", "DELETE"],
];

const KEYBOARD_ROWS_EN = [
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
  ["ENTER", "Z", "X", "C", "V", "B", "N", "M", "DELETE"],
];

const MESSAGES = {
  fr: {
    tooShort: "Trop court",
    notInList: "Pas dans la liste",
    congratulations: "Félicitations !",
    lost: "Perdu ! Le mot était :",
    attempts: (count: number) => `${count} ${count > 1 ? "essais" : "essai"}`,
    amazing: "Bravo !",
    tooBad: "Dommage...",
    foundWord: (count: number) => `Vous avez trouvé le mot en ${count} ${count > 1 ? "essais" : "essai"}.`,
    newGame: "Nouvelle Partie",
    about: "À propos",
    sources: "Sources",
    language: "Langue",
    switchToEnglish: "Switch to English",
    switchToFrench: "Passer au français",
    myId: "Mon ID",
    copyId: "Copier l'ID",
    qrCode: "Code QR",
    scanToRestore: "Scannez pour restaurer votre ID",
    idCopied: "ID copié !",
  },
  en: {
    tooShort: "Too short",
    notInList: "Not in list",
    congratulations: "Congratulations!",
    lost: "Lost! The word was:",
    attempts: (count: number) => `${count} ${count > 1 ? "attempts" : "attempt"}`,
    amazing: "Amazing!",
    tooBad: "Too bad...",
    foundWord: (count: number) => `You found the word in ${count} ${count > 1 ? "attempts" : "attempt"}.`,
    newGame: "New Game",
    about: "About",
    sources: "Sources",
    language: "Language",
    switchToEnglish: "Switch to English",
    switchToFrench: "Switch to French",
    myId: "My ID",
    copyId: "Copy ID",
    qrCode: "QR Code",
    scanToRestore: "Scan to restore your ID",
    idCopied: "ID copied!",
  },
};

const TITLE_TRANSLATION = {
  fr: "LE MOT",
  en: "WORDLE",
};

interface PlayerStats {
  playerId: string;
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  lastPlayedDate: string | null;
}

export function App({ language }: AppProps) {
  const [targetWord, setTargetWord] = useState("");
  const [guesses, setGuesses] = useState<string[]>([]);
  const [currentGuess, setCurrentGuess] = useState("");
  const [gameState, setGameState] = useState<"PLAYING" | "WON" | "LOST">("PLAYING");
  const [message, setMessage] = useState("");
  const [shake, setShake] = useState(false);
  const [usedLetters, setUsedLetters] = useState<Record<string, Status>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [playerId, setPlayerId] = useState("");
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [gameDate] = useState(new Date().toISOString().split("T")[0]);
  const [showQrCode, setShowQrCode] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState("");
  const hasSavedRef = useRef<string | null>(null);

  const msgs = MESSAGES[language];
  const keyboardRows = language === "fr" ? KEYBOARD_ROWS_FR : KEYBOARD_ROWS_EN;

  // Initialize playerId and load player stats
  useEffect(() => {
    initializePlayer();
  }, []);

  const initializePlayer = async () => {
    // Check if playerId is in URL query parameter
    const params = new URLSearchParams(window.location.search);
    const urlPlayerId = params.get("playerId");

    let id = urlPlayerId || localStorage.getItem("playerId");
    
    if (!id) {
      id = crypto.randomUUID();
    }
    
    // Save to localStorage
    localStorage.setItem("playerId", id);
    setPlayerId(id);

    // Load player stats
    try {
      const response = await fetch(`/api/player/${id}`);
      const stats = await response.json();
      setPlayerStats(stats);
    } catch (error) {
      console.error("Failed to load player stats:", error);
      // Initialize with default stats
      setPlayerStats({
        playerId: id,
        gamesPlayed: 0,
        gamesWon: 0,
        currentStreak: 0,
        maxStreak: 0,
        lastPlayedDate: null,
      });
    }
  };

  // Initialize game
  useEffect(() => {
    if (playerId) {
      startNewGame();
    }
  }, [language, playerId]);

  const startNewGame = async (forceRandom = false) => {
    try {
      // Clear saving ref for the new game
      hasSavedRef.current = null;

      if (!forceRandom) {
        // Load today's game record (if exists)
        const gameRecordResponse = await fetch(
          `/api/game/today?playerId=${playerId}&lang=${language}`
        );
        const { gameRecord } = await gameRecordResponse.json();

        // If game already played today, restore the state
        if (gameRecord) {
          setTargetWord(gameRecord.solution);
          setGuesses(gameRecord.attempts);
          setCurrentGuess("");
          setGameState(gameRecord.won ? "WON" : "LOST");
          setMessage("");
          
          // Restore used letters
          const newUsedLetters: Record<string, Status> = {};
          gameRecord.attempts.forEach((guess) => {
            const statuses = getLetterStatuses(guess, gameRecord.solution);
            guess.split("").forEach((char, i) => {
              const status = statuses[i];
              const currentStatus = newUsedLetters[char];
              if (!currentStatus || status === "correct" || (status === "present" && currentStatus === "absent")) {
                newUsedLetters[char] = status;
              }
            });
          });
          setUsedLetters(newUsedLetters);
          // Mark as saved since it's a restored game
          hasSavedRef.current = `${gameRecord.solution}-${gameRecord.attempts.length}`;
          return;
        }
      }

      // Get daily word for today or random if forced
      const endpoint = forceRandom 
        ? `/api/random-word?lang=${language}`
        : `/api/daily-word?lang=${language}&date=${gameDate}`;
      
      const response = await fetch(endpoint);
      const data = await response.json();
      const word = data.word;
      
      setTargetWord(word);
      setGuesses([]);
      setCurrentGuess("");
      setGameState("PLAYING");
      setMessage("");
      setUsedLetters({});
    } catch (error) {
      console.error("Failed to start new game:", error);
      // Fallback to random word if daily word fails
      const response = await fetch(`/api/random-word?lang=${language}`);
      const data = await response.json();
      setTargetWord(data.word);
      setGuesses([]);
      setCurrentGuess("");
      setGameState("PLAYING");
      setMessage("");
      setUsedLetters({});
    }
  };

  // Save game stats when game ends
  useEffect(() => {
    const gameId = `${targetWord}-${guesses.length}`;
    if (gameState !== "PLAYING" && targetWord && playerId && playerStats && hasSavedRef.current !== gameId) {
      saveGameStats();
      hasSavedRef.current = gameId;
    }
  }, [gameState, targetWord, playerId, playerStats, guesses, gameDate]);

  const saveGameStats = async () => {
    if (!playerId || !playerStats) return;

    try {
      const isWon = gameState === "WON";
      const newGamesPlayed = playerStats.gamesPlayed + 1;
      const newGamesWon = isWon ? playerStats.gamesWon + 1 : playerStats.gamesWon;

      // Calculate streak
      let newCurrentStreak = playerStats.currentStreak;
      if (isWon) {
        newCurrentStreak = playerStats.currentStreak + 1;
      } else {
        newCurrentStreak = 0;
      }

      const newMaxStreak = Math.max(newCurrentStreak, playerStats.maxStreak);

      // Save to backend
      const response = await fetch("/api/player/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId,
          stats: {
            gamesPlayed: newGamesPlayed,
            gamesWon: newGamesWon,
            currentStreak: newCurrentStreak,
            maxStreak: newMaxStreak,
            lastPlayedDate: gameDate,
          },
        }),
      });

      if (response.ok) {
        // Update local stats
        setPlayerStats({
          ...playerStats,
          gamesPlayed: newGamesPlayed,
          gamesWon: newGamesWon,
          currentStreak: newCurrentStreak,
          maxStreak: newMaxStreak,
          lastPlayedDate: gameDate,
        });

        // Save game record
        await fetch("/api/game/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            playerId,
            date: gameDate,
            solution: targetWord,
            attempts: guesses,
            won: isWon,
          }),
        });
      }
    } catch (error) {
      console.error("Failed to save game stats:", error);
    }
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

  const handleKeyPress = useCallback(async (key: string) => {
    if (gameState !== "PLAYING") return;

    if (key === "ENTER" || key === "Enter") {
      if (currentGuess.length < 5) {
        setMessage(msgs.tooShort);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }

      // Validate word via API
      const response = await fetch(`/api/validate-word?lang=${language}&word=${currentGuess}`);
      const data = await response.json();
      
      if (!data.isValid) {
        setMessage(msgs.notInList);
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
        setMessage(msgs.congratulations);
      } else if (newGuesses.length === 6) {
        setGameState("LOST");
        setMessage(`${msgs.lost} ${targetWord}`);
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
  }, [currentGuess, gameState, guesses, targetWord, getLetterStatuses, usedLetters, msgs, language]);

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

  const copyPlayerId = async () => {
    try {
      await navigator.clipboard.writeText(playerId);
      setCopyFeedback(msgs.idCopied);
      setTimeout(() => setCopyFeedback(""), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const getQrCodeUrl = () => {
    const baseUrl = window.location.origin;
    const currentPath = language === "en" ? "/en" : "/fr";
    return `${baseUrl}${currentPath}?playerId=${playerId}`;
  };

  const handleLanguageChange = (newLanguage: Language) => {
    if (newLanguage !== language) {
      window.location.href = newLanguage === "en" ? "/en" : "/fr";
    }
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-2 max-w-md mx-auto relative bg-[#121213]">
      <header className="w-full border-b border-gray-700 py-2 mb-3 flex items-center justify-between">
        <h1 className="text-2xl md:text-4xl font-black tracking-widest flex-1 text-center">{TITLE_TRANSLATION[language]}</h1>
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="absolute top-2 right-2 p-2 text-xl hover:bg-gray-700 rounded transition-colors"
          title="Menu"
        >
          ☰
        </button>
      </header>

      {/* Menu Burger */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-40 flex" onClick={() => setIsMenuOpen(false)}>
          <div 
            className="bg-[#1a1a1b] border border-gray-700 rounded-lg shadow-2xl p-4 m-2 max-w-xs w-full md:max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Menu</h2>
              <button
                onClick={() => setIsMenuOpen(false)}
                className="text-2xl hover:text-gray-400 transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3">
              {/* Statistics */}
              {playerStats && (
                <div className="pb-3 border-b border-gray-700">
                  <h3 className="text-sm font-semibold mb-2 text-gray-400">
                    {language === "fr" ? "Statistiques" : "Statistics"}
                  </h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-center p-2 bg-gray-900 rounded">
                      <div className="font-bold text-lg">{playerStats.gamesPlayed}</div>
                      <div className="text-xs text-gray-400">
                        {language === "fr" ? "Parties" : "Games"}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-900 rounded">
                      <div className="font-bold text-lg">
                        {playerStats.gamesPlayed > 0
                          ? Math.round((playerStats.gamesWon / playerStats.gamesPlayed) * 100)
                          : 0}%
                      </div>
                      <div className="text-xs text-gray-400">
                        {language === "fr" ? "Victoires" : "Wins"}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-900 rounded">
                      <div className="font-bold text-lg">{playerStats.currentStreak}</div>
                      <div className="text-xs text-gray-400">
                        {language === "fr" ? "Série" : "Streak"}
                      </div>
                    </div>
                    <div className="text-center p-2 bg-gray-900 rounded">
                      <div className="font-bold text-lg">{playerStats.maxStreak}</div>
                      <div className="text-xs text-gray-400">
                        {language === "fr" ? "Max" : "Max"}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Player ID and QR Code */}
              <div className="pb-3 border-b border-gray-700">
                <button
                  onClick={() => setShowQrCode(!showQrCode)}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-left font-semibold mb-2"
                >
                  {msgs.myId}: {playerId.slice(0, 8)}...
                </button>
                
                {showQrCode && (
                  <div className="bg-gray-900 p-4 rounded flex flex-col items-center gap-3">
                    <div className="bg-white p-2 rounded">
                      <QRCodeSVG 
                        value={getQrCodeUrl()} 
                        size={150} 
                        level="H" 
                        includeMargin={true}
                      />
                    </div>
                    <p className="text-xs text-gray-400 text-center">
                      {msgs.scanToRestore}
                    </p>
                    <button
                      onClick={copyPlayerId}
                      className="w-full px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded text-sm transition-colors"
                    >
                      {msgs.copyId}
                    </button>
                    {copyFeedback && (
                      <p className="text-xs text-green-400">{copyFeedback}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Language Switcher */}
              <div className="pb-3 border-b border-gray-700">
                <button
                  onClick={() => {
                    handleLanguageChange(language === "fr" ? "en" : "fr");
                    setIsMenuOpen(false);
                  }}
                  className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors text-left font-semibold"
                >
                  {msgs.language}: {language === "fr" ? "English" : "Français"}
                </button>
              </div>

              {/* About */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  alert(language === "fr" 
                    ? "Le Mot - Wordle en Français & English\n\nDéveloppé par Yann\n\n avec Antigravity (gemini 3 flash) et GitHub Copilot (Claude Haiku 4.5)\n\nUn jeu de réflexion où vous devez deviner un mot de 5 lettres en 6 essais."
                    : "Le Mot - Wordle in French & English\n\nDeveloped by Yann\n\n with Antigravity (gemini 3 flash) and GitHub Copilot (Claude Haiku 4.5)\n\nA puzzle game where you must guess a 5-letter word in 6 attempts."
                  );
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-700 rounded transition-colors"
              >
                {msgs.about}
              </button>

              {/* Sources */}
              <button
                onClick={() => {
                  setIsMenuOpen(false);
                  window.open("https://github.com/yanngv29/wordle", "_blank");
                }}
                className="w-full px-4 py-2 text-left hover:bg-gray-700 rounded transition-colors"
              >
                {msgs.sources}
              </button>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full flex flex-col items-center justify-center gap-1">
        {/* Grid */}
        <div className={`grid grid-rows-6 gap-1 w-full max-w-[300px] md:max-w-[350px] ${shake ? "animate-shake" : ""}`}>
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
        <div className="h-10 flex items-center justify-center">
          {message && (
            <div className="bg-white text-black px-4 py-2 rounded-md font-bold shadow-lg text-sm">
              {message}
            </div>
          )}
        </div>
      </main>

      {/* Keyboard */}
      <footer className="w-full max-w-[450px] md:max-w-[500px] mt-2 mb-2">
        <div className="flex flex-col gap-1.5">
          {keyboardRows.map((row, i) => (
            <div key={i} className="flex gap-1 justify-center">
              {row.map(key => {
                const status = usedLetters[key] || "";
                return (
                  <button
                    key={key}
                    onClick={() => handleKeyPress(key)}
                    className={`key text-xs md:text-sm ${key.length > 1 ? "wide" : ""} ${status}`}
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
          <div className="bg-[#121213] border border-gray-700 p-6 md:p-8 rounded-xl shadow-2xl text-center max-w-sm w-full mx-2 animate-bounce-in">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              {gameState === "WON" ? msgs.amazing : msgs.tooBad}
            </h2>
            <p className="text-gray-400 mb-6 text-sm md:text-base">
              {gameState === "WON" 
                ? msgs.foundWord(guesses.length)
                : `${msgs.lost} ${targetWord}`}
            </p>
            <button
              onClick={() => startNewGame(true)}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-6 md:py-3 md:px-8 rounded-full transition-colors text-sm md:text-lg"
            >
              {msgs.newGame}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
