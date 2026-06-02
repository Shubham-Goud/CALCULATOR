"use strict";

const STORAGE_KEYS = {
  history: "calcx-history",
  prefs: "calcx-preferences"
};

const currencyRates = {
  USD: 1,
  INR: 83.1,
  EUR: 0.92,
  GBP: 0.78,
  JPY: 156.3,
  AUD: 1.51
};

const unitMap = {
  length: {
    meter: 1,
    kilometer: 1000,
    centimeter: 0.01,
    inch: 0.0254,
    foot: 0.3048,
    mile: 1609.344
  },
  weight: {
    gram: 1,
    kilogram: 1000,
    pound: 453.59237,
    ounce: 28.349523
  },
  temperature: {
    Celsius: "c",
    Fahrenheit: "f",
    Kelvin: "k"
  }
};

const state = {
  expression: "",
  result: "0",
  history: [],
  prefs: {
    theme: "dark",
    sound: true,
    voiceOutput: false,
    saveHistory: true,
    angleUnit: "deg"
  }
};

const dom = {
  expression: document.querySelector("#expressionDisplay"),
  result: document.querySelector("#resultDisplay"),
  status: document.querySelector("#statusLine"),
  historyList: document.querySelector("#historyList"),
  historyTemplate: document.querySelector("#historyItemTemplate"),
  themeToggle: document.querySelector("#themeToggle"),
  soundToggle: document.querySelector("#soundToggle"),
  voiceInputBtn: document.querySelector("#voiceInputBtn"),
  voiceOutputToggle: document.querySelector("#voiceOutputToggle"),
  historyToggle: document.querySelector("#historyToggle"),
  angleUnit: document.querySelector("#angleUnit")
};

const formatNumber = (value) => {
  if (!Number.isFinite(value)) return "Error";
  if (Math.abs(value) > 1e12 || (Math.abs(value) < 1e-6 && value !== 0)) return value.toExponential(8);
  return Number.parseFloat(value.toFixed(10)).toString();
};

const savePrefs = () => localStorage.setItem(STORAGE_KEYS.prefs, JSON.stringify(state.prefs));
const saveHistory = () => localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(state.history));

function loadState() {
  try {
    state.history = JSON.parse(localStorage.getItem(STORAGE_KEYS.history)) || [];
    state.prefs = { ...state.prefs, ...(JSON.parse(localStorage.getItem(STORAGE_KEYS.prefs)) || {}) };
  } catch {
    state.history = [];
  }
}

function render() {
  dom.expression.textContent = state.expression || "0";
  dom.result.textContent = state.result;
  document.documentElement.dataset.theme = state.prefs.theme;
  dom.voiceOutputToggle.checked = state.prefs.voiceOutput;
  dom.historyToggle.checked = state.prefs.saveHistory;
  dom.angleUnit.value = state.prefs.angleUnit;
  dom.soundToggle.classList.toggle("is-muted", !state.prefs.sound);
  renderHistory();
}

function setStatus(message, kind = "info") {
  dom.status.textContent = message;
  dom.status.dataset.kind = kind;
}

function playClick() {
  if (!state.prefs.sound) return;
  const audio = new AudioContext();
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.frequency.value = 520;
  gain.gain.value = 0.035;
  osc.connect(gain);
  gain.connect(audio.destination);
  osc.start();
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + 0.08);
  osc.stop(audio.currentTime + 0.09);
}

function appendToken(token) {
  if (state.result === "Error") allClear();
  const last = state.expression.slice(-1);
  const operators = "+-*/^%";

  if (token === "." && /(\d*\.\d*)$/.test(state.expression)) return;
  if (operators.includes(token) && (!state.expression || operators.includes(last))) {
    if (token !== "-" || last === "-") return;
    state.expression += token;
  } else {
    state.expression += token;
  }

  previewExpression();
  render();
}

function clearEntry() {
  state.expression = "";
  state.result = "0";
  setStatus("Entry cleared.");
  render();
}

function allClear() {
  state.expression = "";
  state.result = "0";
  setStatus("All clear.");
  render();
}

function backspace() {
  state.expression = state.expression.slice(0, -1);
  previewExpression();
  render();
}

function toggleSign() {
  if (!state.expression) {
    state.expression = "-";
  } else if (state.expression.startsWith("-")) {
    state.expression = state.expression.slice(1);
  } else {
    state.expression = `-${state.expression}`;
  }
  previewExpression();
  render();
}

function sanitizeExpression(expression) {
  return expression
    .replaceAll("π", `(${Math.PI})`)
    .replaceAll("e", `(${Math.E})`)
    .replaceAll("^", "**")
    .replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
}

function assertSafeExpression(expression) {
  if (!/^[\d+\-*/().%\sπe^]+$/.test(expression)) {
    throw new Error("Unsupported input detected.");
  }
  if (/\/\s*0(?:\.0+)?(?!\d)/.test(expression)) {
    throw new Error("Division by zero is not allowed.");
  }
}

function evaluateExpression(expression) {
  const raw = expression.trim();
  if (!raw) return 0;
  assertSafeExpression(raw);
  const sanitized = sanitizeExpression(raw);
  const value = Function(`"use strict"; return (${sanitized})`)();
  if (!Number.isFinite(value)) throw new Error("Result is outside calculable range.");
  return value;
}

function previewExpression() {
  try {
    if (!state.expression || /[+\-*/^.(]$/.test(state.expression)) return;
    const value = evaluateExpression(state.expression);
    state.result = formatNumber(value);
    setStatus("Preview updated.");
  } catch {
    setStatus("Keep typing to complete the expression.");
  }
}

function calculate() {
  try {
    const expression = state.expression || state.result;
    const value = evaluateExpression(expression);
    const result = formatNumber(value);
    state.result = result;
    state.expression = result;
    setStatus("Calculation complete.", "success");
    if (state.prefs.saveHistory) addHistory(expression, result);
    speakResult(result);
  } catch (error) {
    state.result = "Error";
    setStatus(error.message, "error");
  }
  render();
}

function getCurrentValue() {
  const source = state.expression || state.result;
  return evaluateExpression(source);
}

function runScientific(action) {
  try {
    const value = getCurrentValue();
    const radians = state.prefs.angleUnit === "deg" ? (value * Math.PI) / 180 : value;
    const operations = {
      sqrt: () => {
        if (value < 0) throw new Error("Square root needs a non-negative number.");
        return Math.sqrt(value);
      },
      square: () => value ** 2,
      log: () => {
        if (value <= 0) throw new Error("Log needs a positive number.");
        return Math.log10(value);
      },
      ln: () => {
        if (value <= 0) throw new Error("Natural log needs a positive number.");
        return Math.log(value);
      },
      sin: () => Math.sin(radians),
      cos: () => Math.cos(radians),
      tan: () => Math.tan(radians),
      factorial: () => factorial(value)
    };
    const result = formatNumber(operations[action]());
    addHistory(`${action}(${state.expression || state.result})`, result);
    state.expression = result;
    state.result = result;
    setStatus(`${action} applied.`, "success");
    speakResult(result);
  } catch (error) {
    state.result = "Error";
    setStatus(error.message, "error");
  }
  render();
}

function factorial(value) {
  if (!Number.isInteger(value) || value < 0 || value > 170) {
    throw new Error("Factorial supports integers from 0 to 170.");
  }
  let total = 1;
  for (let index = 2; index <= value; index += 1) total *= index;
  return total;
}

function addHistory(expression, result) {
  state.history.unshift({
    id: crypto.randomUUID(),
    expression,
    result,
    createdAt: new Date().toLocaleString()
  });
  state.history = state.history.slice(0, 30);
  saveHistory();
}

function renderHistory() {
  dom.historyList.innerHTML = "";
  if (!state.history.length) {
    const item = document.createElement("li");
    item.className = "history-empty";
    item.textContent = "No calculations yet.";
    dom.historyList.append(item);
    return;
  }

  state.history.forEach((entry) => {
    const clone = dom.historyTemplate.content.cloneNode(true);
    const reuse = clone.querySelector(".history-reuse");
    const remove = clone.querySelector(".history-delete");
    reuse.innerHTML = `<strong>${entry.result}</strong><small>${entry.expression} · ${entry.createdAt}</small>`;
    reuse.addEventListener("click", () => {
      state.expression = entry.result;
      state.result = entry.result;
      setStatus("History result reused.");
      render();
    });
    remove.addEventListener("click", () => {
      state.history = state.history.filter((item) => item.id !== entry.id);
      saveHistory();
      render();
    });
    dom.historyList.append(clone);
  });
}

function speakResult(result) {
  if (!state.prefs.voiceOutput || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  speechSynthesis.speak(new SpeechSynthesisUtterance(`The result is ${result}`));
}

function startVoiceInput() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    setStatus("Voice input is not supported in this browser.", "error");
    return;
  }
  const recognition = new Recognition();
  recognition.lang = "en-US";
  recognition.interimResults = false;
  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    state.expression = transcript
      .toLowerCase()
      .replaceAll("plus", "+")
      .replaceAll("minus", "-")
      .replaceAll("times", "*")
      .replaceAll("multiplied by", "*")
      .replaceAll("divided by", "/")
      .replaceAll("point", ".")
      .replaceAll("pi", "π");
    calculate();
  };
  recognition.onerror = () => setStatus("Could not capture voice input.", "error");
  recognition.start();
  setStatus("Listening for a calculation...");
}

function setupConverters() {
  const currencyFrom = document.querySelector("#currencyFrom");
  const currencyTo = document.querySelector("#currencyTo");
  Object.keys(currencyRates).forEach((code) => {
    currencyFrom.add(new Option(code, code));
    currencyTo.add(new Option(code, code));
  });
  currencyFrom.value = "USD";
  currencyTo.value = "INR";

  const updateCurrency = () => {
    const amount = Number(document.querySelector("#currencyAmount").value || 0);
    const from = currencyFrom.value;
    const to = currencyTo.value;
    const result = (amount / currencyRates[from]) * currencyRates[to];
    document.querySelector("#currencyResult").textContent = `${amount} ${from} = ${formatNumber(result)} ${to}`;
  };
  document.querySelector("#currencyForm").addEventListener("input", updateCurrency);
  updateCurrency();

  const unitType = document.querySelector("#unitType");
  const unitFrom = document.querySelector("#unitFrom");
  const unitTo = document.querySelector("#unitTo");
  const unitAmount = document.querySelector("#unitAmount");
  const unitResult = document.querySelector("#unitResult");

  const populateUnits = () => {
    unitFrom.innerHTML = "";
    unitTo.innerHTML = "";
    Object.keys(unitMap[unitType.value]).forEach((unit) => {
      unitFrom.add(new Option(unit, unit));
      unitTo.add(new Option(unit, unit));
    });
    unitTo.selectedIndex = Math.min(1, unitTo.options.length - 1);
    updateUnits();
  };

  const convertTemperature = (value, from, to) => {
    const celsius = from === "Celsius" ? value : from === "Fahrenheit" ? (value - 32) * (5 / 9) : value - 273.15;
    if (to === "Celsius") return celsius;
    if (to === "Fahrenheit") return celsius * (9 / 5) + 32;
    return celsius + 273.15;
  };

  function updateUnits() {
    const value = Number(unitAmount.value || 0);
    const type = unitType.value;
    const from = unitFrom.value;
    const to = unitTo.value;
    const result =
      type === "temperature"
        ? convertTemperature(value, from, to)
        : (value * unitMap[type][from]) / unitMap[type][to];
    unitResult.textContent = `${value} ${from} = ${formatNumber(result)} ${to}`;
  }

  unitType.addEventListener("change", populateUnits);
  document.querySelector("#unitForm").addEventListener("input", updateUnits);
  populateUnits();
}

function bindEvents() {
  document.querySelectorAll("[data-token]").forEach((button) => {
    button.addEventListener("click", () => {
      playClick();
      appendToken(button.dataset.token);
    });
  });

  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      playClick();
      const actions = {
        "all-clear": allClear,
        "clear-entry": clearEntry,
        backspace,
        "toggle-sign": toggleSign,
        calculate
      };
      actions[button.dataset.action]();
    });
  });

  document.querySelectorAll("[data-science]").forEach((button) => {
    button.addEventListener("click", () => {
      playClick();
      runScientific(button.dataset.science);
    });
  });

  document.querySelectorAll(".mode-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".mode-tab").forEach((item) => {
        item.classList.remove("is-active");
        item.setAttribute("aria-selected", "false");
      });
      tab.classList.add("is-active");
      tab.setAttribute("aria-selected", "true");
      document.querySelector("#standardPanel").classList.add("is-active");
      document.querySelector("#scientificPanel").classList.toggle("is-active", tab.dataset.panel === "scientificPanel");
    });
  });

  document.addEventListener("keydown", (event) => {
    if (/[\d+\-*/().%^]/.test(event.key)) appendToken(event.key);
    if (event.key === "Enter" || event.key === "=") calculate();
    if (event.key === "Backspace") backspace();
    if (event.key === "Delete") clearEntry();
    if (event.key === "Escape") allClear();
  });

  dom.themeToggle.addEventListener("click", () => {
    state.prefs.theme = state.prefs.theme === "dark" ? "light" : "dark";
    savePrefs();
    render();
  });

  dom.soundToggle.addEventListener("click", () => {
    state.prefs.sound = !state.prefs.sound;
    savePrefs();
    render();
  });

  dom.voiceOutputToggle.addEventListener("change", () => {
    state.prefs.voiceOutput = dom.voiceOutputToggle.checked;
    savePrefs();
  });

  dom.historyToggle.addEventListener("change", () => {
    state.prefs.saveHistory = dom.historyToggle.checked;
    savePrefs();
  });

  dom.angleUnit.addEventListener("change", () => {
    state.prefs.angleUnit = dom.angleUnit.value;
    savePrefs();
  });

  dom.voiceInputBtn.addEventListener("click", startVoiceInput);

  document.querySelector("#copyBtn").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(state.result);
      setStatus("Result copied to clipboard.", "success");
    } catch {
      setStatus("Clipboard access is unavailable in this browser.", "error");
    }
  });

  document.querySelector("#clearHistoryBtn").addEventListener("click", () => {
    state.history = [];
    saveHistory();
    render();
  });
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("service-worker.js").catch(() => {
      setStatus("Offline cache registration failed.", "error");
    });
  }
}

loadState();
bindEvents();
setupConverters();
render();
registerServiceWorker();
