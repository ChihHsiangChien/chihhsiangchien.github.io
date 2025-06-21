(function() {
  // --- DOM Elements ---
  const display = document.getElementById('display');
  const keypad = document.getElementById('keypad');
  const ledsContainer = document.getElementById('leds'); // Address LEDs
  const leds2pinContainer = document.getElementById('led2pins'); // CAL instruction LEDs


  const regAEl = document.getElementById('regA');
  const regBEl = document.getElementById('regB');
  const regYEl = document.getElementById('regY');
  const regFlagEl = document.getElementById('regFlag');
  const regPCEl = document.getElementById('regPC');
  const programViewRaw = document.getElementById('programViewRaw');
  const programViewDisassembled = document.getElementById('programViewDisassembled');

  // --- Constants ---
  // Memory 0x00-0x4F: Program Memory
  // 0x50-0x5F: Data Memory
  // 0x60-0x6F: Register Area (Simulated)
  const MEMORY_SIZE = 112; // 0x70
  const PROGRAM_MEMORY_END = 0x4F;
  const DATA_MEMORY_START = 0x50;
  const DATA_MEMORY_END = 0x5F;
  const NIBBLE_MASK = 0x0F;
  const PIN2_COUNT = 7;
  const ADDRESS_LED_COUNT = 7;

  // Mapping for 7-segment display
  const SEGMENT_MAP = {
    '0': ['a', 'b', 'c', 'd', 'e', 'f'],
    '1': ['b', 'c'],
    '2': ['a', 'b', 'g', 'e', 'd'],
    '3': ['a', 'b', 'g', 'c', 'd'],
    '4': ['f', 'g', 'b', 'c'],
    '5': ['a', 'f', 'g', 'c', 'd'],
    '6': ['a', 'f', 'g', 'e', 'c', 'd'],
    '7': ['a', 'b', 'c'],
    '8': ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
    '9': ['a', 'b', 'c', 'd', 'f', 'g'],
    'A': ['a', 'b', 'c', 'e', 'f', 'g'],
    'B': ['f', 'e', 'g', 'c', 'd'], // Represents 'b'
    'C': ['a', 'f', 'e', 'd'],
    'D': ['b', 'c', 'd', 'e', 'g'], // Represents 'd'
    'E': ['a', 'f', 'g', 'e', 'd'],
    'F': ['a', 'f', 'g', 'e'],
  };

  // --- Disassembler Maps ---
  const INSTRUCTION_MAP = {
    0x0: { mnemonic: 'KA', operands: 0 },
    0x1: { mnemonic: 'AO', operands: 0 },
    0x2: { mnemonic: 'CH', operands: 0 },
    0x3: { mnemonic: 'CY', operands: 0 },
    0x4: { mnemonic: 'AM', operands: 0 },
    0x5: { mnemonic: 'MA', operands: 0 },
    0x6: { mnemonic: 'M+', operands: 0 },
    0x7: { mnemonic: 'M-', operands: 0 },
    0x8: { mnemonic: 'TIA', operands: 1 },
    0x9: { mnemonic: 'AIA', operands: 1 },
    0xA: { mnemonic: 'TIY', operands: 1 },
    0xB: { mnemonic: 'AIY', operands: 1 },
    0xC: { mnemonic: 'CIA', operands: 1 },
    0xD: { mnemonic: 'CIY', operands: 1 },
    0xE: { mnemonic: 'CAL', operands: 1 }, // Special case, operand is a sub-opcode
    0xF: { mnemonic: 'JUMP', operands: 2 },
  };

  const CAL_INSTRUCTION_MAP = {
    0x0: { mnemonic: 'RSTO' },
    0x1: { mnemonic: 'SETR' },
    0x2: { mnemonic: 'RSTR' },
    0x4: { mnemonic: 'CMPL' },
    0x7: { mnemonic: 'ENDS' },
    0x8: { mnemonic: 'ERRS' },
    0x9: { mnemonic: 'SHTS' },
    0xA: { mnemonic: 'LONS' },
    0xB: { mnemonic: 'SUND' },
    0xC: { mnemonic: 'TIMR' },
    0xD: { mnemonic: 'DSPR' },
    0xE: { mnemonic: 'DEM-' },
    0xF: { mnemonic: 'DEM+' },
  };
  // --- State ---
  const memory = new Uint8Array(MEMORY_SIZE);
  let addrPtr = 0x00; // Program Counter (PC)
  const writtenAddresses = new Set();
  let tempInput = null;
  let asetBuffer = [];

  let regA = 0;
  let regB = 0;
  let regY = 0;
  let flag = 0;

  let isRunning = false;

  // --- UI Initialization ---
  function createLEDs(container, count) {
    for (let i = 0; i < count; i++) {
      const led = document.createElement('div');
      led.className = 'w-5 h-5 rounded-full bg-gray-600';
      container.appendChild(led);
    }
  }

  createLEDs(ledsContainer, ADDRESS_LED_COUNT);
  createLEDs(leds2pinContainer, PIN2_COUNT);

  // --- UI Update Functions ---
  function setLEDState(ledElement, state, onColor, offColor = 'bg-gray-600') {
    if (ledElement) {
      ledElement.className = `w-5 h-5 rounded-full ${state ? onColor : offColor}`;
    }
  }

  function updateAddressLEDs(addr) {
    for (let i = 0; i < ADDRESS_LED_COUNT; i++) {
      // To display MSB on the left and LSB on the right, we reverse the bit order.
      // The leftmost LED (index 0) should show the most significant bit (bit 6).
      // The rightmost LED (index 6) should show the least significant bit (bit 0).
      const bit = (addr >> (ADDRESS_LED_COUNT - 1 - i)) & 1;
      setLEDState(ledsContainer.children[i], bit, 'bg-green-400');
    }
  }

  function set2PinLED(index, on) {
    if (index < 0 || index >= PIN2_COUNT) return;
    setLEDState(leds2pinContainer.children[index], on, 'bg-yellow-400');
  }

  function set2PinLEDsFromByte(byteVal) {
    for (let i = 0; i < PIN2_COUNT; i++) {
      // Display MSB on the left and LSB on the right, consistent with Address LEDs.
      // The leftmost LED (index 0) should show the most significant bit (bit 6).
      const bit = (byteVal >> (PIN2_COUNT - 1 - i)) & 1;
      set2PinLED(i, bit);
    }
  }

  function clear2PinLEDs() {
    for (let i = 0; i < PIN2_COUNT; i++) {
      set2PinLED(i, false);
    }
  }

  function updateDisplay(val) {
    const hexChar = val.toString(16).toUpperCase();
    const segmentsToLight = SEGMENT_MAP[hexChar] || []; // Default to blank if char not found

    const allSegmentElements = document.querySelectorAll('#display .segment');

    allSegmentElements.forEach(segmentEl => {
      // The second class is the segment identifier (a, b, c, etc.)
      const segmentId = segmentEl.classList[1];
      if (segmentsToLight.includes(segmentId)) {
        segmentEl.classList.add('on');
      } else {
        segmentEl.classList.remove('on');
      }
    });
  }

  function updateRegisters() {
    regAEl.textContent = regA;
    regBEl.textContent = regB;
    regYEl.textContent = regY;
    regFlagEl.textContent = flag;
    regPCEl.textContent = addrPtr.toString(16).padStart(2, '0').toUpperCase();
  }

  function updateProgramView() {
    let rawMemoryTxt = '';
    let disassembledTxt = '';
    let currentDisassemblyAddr = 0;

    // --- Generate Raw Memory View (Left Column) ---
    // This shows the content of all program memory addresses.
    for (let i = 0; i <= PROGRAM_MEMORY_END; i++) {
      const value = memory[i];
      let valueStr = value.toString(16).toUpperCase();
      // If it's a default 'F' (not explicitly written), make it lighter.
      if (value === NIBBLE_MASK && !writtenAddresses.has(i)) {
        valueStr = `<span class="text-gray-500">${valueStr}</span>`;
      }
      rawMemoryTxt += `${i.toString(16).padStart(2, '0').toUpperCase()}: ${valueStr}\n`;
    }
    programViewRaw.innerHTML = rawMemoryTxt;

    // --- Generate Disassembled View (Right Column) ---
    // This disassembles only the parts of memory that have been written to (or loaded).
    while (currentDisassemblyAddr <= PROGRAM_MEMORY_END) {
      // Only try to disassemble from addresses that the user has actually written to.
      // If a program is loaded via builtins, `writtenAddresses` will contain all its addresses.
      // If the user types, `writtenAddresses` will contain those.
      // This ensures we only show disassembled code for relevant parts.
      if (!writtenAddresses.has(currentDisassemblyAddr)) {
        currentDisassemblyAddr++;
        continue;
      }

      const opcode = memory[currentDisassemblyAddr];
      const instruction = INSTRUCTION_MAP[opcode];
      let line = '';
      let advance = 1;

      if (instruction) {
        const operandCount = instruction.operands;
        let mnemonic = instruction.mnemonic;
        let operandsStr = '';
        const operandValues = [];

        // Read operands
        for (let j = 1; j <= operandCount; j++) {
          const operandAddr = currentDisassemblyAddr + j;
          if (operandAddr <= PROGRAM_MEMORY_END) {
            const operand = memory[operandAddr];
            operandValues.push(operand);
            operandsStr += ` ${operand.toString(16).toUpperCase()}`;
          }
        }

        // Special handling for CAL instruction to show sub-mnemonic
        if (opcode === 0xE && operandValues.length > 0) {
          const subInstruction = CAL_INSTRUCTION_MAP[operandValues[0]];
          mnemonic = `CAL ${subInstruction ? subInstruction.mnemonic : '???'}`;
        }

        const codeStr = `${opcode.toString(16).toUpperCase()}${operandsStr}`;
        line = `${currentDisassemblyAddr.toString(16).padStart(2, '0').toUpperCase()}: ${codeStr.padEnd(5)} | ${mnemonic}`;
        advance = 1 + operandCount;
      } else {
        // If it's not a recognized instruction, just show the raw hex for the disassembler side.
        line = `${currentDisassemblyAddr.toString(16).padStart(2, '0').toUpperCase()}: ${opcode.toString(16).toUpperCase()}      | (Data/Unknown)`;
      }
      disassembledTxt += line + '\n';
      currentDisassemblyAddr += advance;
    }
    programViewDisassembled.textContent = disassembledTxt;
  }

  // --- UI Feedback ---
  function provideButtonFeedback(buttonElement) {
    // Add classes for the pressed state.
    buttonElement.classList.add('transform', 'scale-95', 'brightness-90');

    // Remove the classes after a short delay to create a "click" effect.
    setTimeout(() => {
      buttonElement.classList.remove('transform', 'scale-95', 'brightness-90');
    }, 150);
  }

  // --- Audio ---
  const audioCtx = new(window.AudioContext || window.webkitAudioContext)();

  function playSound(freq, duration, type = 'square') {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    osc.frequency.value = freq;
    osc.type = type;
    osc.connect(audioCtx.destination);
    osc.start();
    setTimeout(() => osc.stop(), duration);
  }

  function playShortPi() { playSound(1000, 100); }
  function playLongPi() { playSound(800, 350); }

  const noteFreqs = [
    0, 262, 294, 330, 349, 392, 440, 494,
    523, 587, 659, 698, 784, 880, 988
  ];

  function playNote(n) {
    if (n >= 1 && n < noteFreqs.length) {
      playSound(noteFreqs[n], 300);
    }
  }

  // --- Keypad and Controls ---
  function setupControls() {
    const keypadLayout = [
        'C', 'D', 'E', 'F', { cmd: 'aset', text: 'A SET', color: 'bg-blue-600', hover: 'hover:bg-blue-700' },
        '8', '9', 'A', 'B', { cmd: 'incr', text: 'INCR', color: 'bg-green-600', hover: 'hover:bg-green-700' },
        '4', '5', '6', '7', { cmd: 'run', text: 'RUN', color: 'bg-yellow-600', hover: 'hover:bg-yellow-700' },
        '0', '1', '2', '3', { cmd: 'reset', text: 'RESET', color: 'bg-red-600', hover: 'hover:bg-red-700' }
    ];

    keypad.innerHTML = ''; // Clear any existing buttons

    const commandHandler = (cmd) => {
        switch (cmd) {
            case 'reset':
                resetMachine();
                break;
            case 'hard_reset':
                hardResetMachine();
                break;
            case 'incr':
                incrMemory();
                break;
            case 'aset':
                setAddress();
                break;
            case 'run':
                if (!isRunning) {
                    if (asetBuffer.length === 1 && loadBuiltinProgram(asetBuffer[0])) {
                        asetBuffer = [];
                        tempInput = null;
                    } else {
                        executeProgram(addrPtr);
                    }
                }
                break;
        }
    };

    keypadLayout.forEach(keyInfo => {
        const btn = document.createElement('button');
        const baseStyle = 'py-2 rounded transition-transform duration-100 ease-in-out select-none';

        if (typeof keyInfo === 'string') {
            // Hex key
            const val = keyInfo;
            btn.textContent = val;
            btn.className = `${baseStyle} bg-gray-700 hover:bg-gray-600 font-mono text-lg`;
            btn.addEventListener('click', (event) => {
                const num = parseInt(val, 16);
                provideButtonFeedback(event.currentTarget);
                playShortPi();
                if (asetBuffer.length < 2) {
                    asetBuffer.push(num);
                    updateDisplay(num);
                } else {
                    tempInput = num;
                    updateDisplay(tempInput);
                }
            });
        } else {
            // Command key
            btn.dataset.cmd = keyInfo.cmd;
            btn.textContent = keyInfo.text;
            btn.className = `${baseStyle} ${keyInfo.color} ${keyInfo.hover}`;
            btn.addEventListener('click', (event) => {
                provideButtonFeedback(event.currentTarget);
                playShortPi();
                commandHandler(keyInfo.cmd);
            });
        }
        keypad.appendChild(btn);
    });

    // The HARD RESET button is separate and still in HTML.
    document.querySelector('button[data-cmd="hard_reset"]').addEventListener('click', (event) => {
        provideButtonFeedback(event.currentTarget);
        playShortPi();
        commandHandler('hard_reset');
    });
  }

  // --- Machine Logic ---
  function resetMachine() {
    addrPtr = 0x00;
    tempInput = null;
    asetBuffer = [];
    regA = 0;
    regB = 0;
    regY = 0;
    flag = 0;
    // Soft RESET: Only resets pointers and registers, memory content is preserved.
    // writtenAddresses is intentionally not cleared on soft reset.
    // On hardware, RESET would show 'F' to indicate readiness.
    updateDisplay(NIBBLE_MASK);
    updateAddressLEDs(addrPtr);
    updateRegisters();
    updateProgramView();
    clear2PinLEDs();
    isRunning = false;
  }

  function hardResetMachine() {
    // The actual hardware resets to 0xF.
    memory.fill(NIBBLE_MASK);
    writtenAddresses.clear();

    // After clearing memory, perform a soft reset to reset registers and UI.
    // This will also update the display to show 'F' from memory[0].
    resetMachine();
    console.log("Hard reset: Memory and registers cleared.");
  }

  function incrMemory() {
    // The value to write is either in tempInput (from >2 key presses)
    // or it's the last thing pushed to asetBuffer.
    let dataToWrite = tempInput;
    if (dataToWrite === null && asetBuffer.length > 0) {
      dataToWrite = asetBuffer[asetBuffer.length - 1];
    }

    if (dataToWrite !== null) {
      memory[addrPtr] = dataToWrite & NIBBLE_MASK;
      writtenAddresses.add(addrPtr);
      updateProgramView();
    }
    addrPtr = (addrPtr + 1) % MEMORY_SIZE;
    tempInput = null;
    asetBuffer = [];
    // After INCR, the hardware display would show 'F' to indicate it's ready for new input,
    // rather than the content of the next memory address.
    updateDisplay(NIBBLE_MASK);
    updateAddressLEDs(addrPtr);
    updateRegisters();
  }

  function setAddress() {
    if (asetBuffer.length === 2) {
      addrPtr = (asetBuffer[0] << 4) | asetBuffer[1];
      if (addrPtr >= MEMORY_SIZE) addrPtr = 0;
      // On hardware, ASET would show 'F' to indicate readiness for input.
      updateDisplay(NIBBLE_MASK);
      updateAddressLEDs(addrPtr);
      updateRegisters();
      asetBuffer = [];
      tempInput = null;
    }
  }

  function loadBuiltinProgram(programNum) {
    const pkg = window.builtins && window.builtins[programNum];
    if (!pkg || !pkg.code) {
      console.warn(`Built-in program for #${programNum.toString(16).toUpperCase()} not found or code array is missing.`);
      return false;
    }
    // Reset state and load program
    addrPtr = 0x00;
    tempInput = null;
    asetBuffer = [];
    regA = regB = regY = flag = 0;
    memory.fill(NIBBLE_MASK);
    writtenAddresses.clear();

    pkg.code.forEach((v, i) => {
      if (i < DATA_MEMORY_START) {
        memory[i] = v & NIBBLE_MASK;
        writtenAddresses.add(i);
      }
    });
    if (pkg.data) { pkg.data.forEach((v, i) => { if (i < 0x10) memory[DATA_MEMORY_START + i] = v & NIBBLE_MASK; }); } // Data memory doesn't show in program view
    updateDisplay(memory[addrPtr]);
    updateAddressLEDs(addrPtr);
    updateRegisters();
    updateProgramView();
    clear2PinLEDs();
    return true;
  }

  // --- Execution Engine ---
  async function executeProgram(startAddr) {
    isRunning = true;
    addrPtr = startAddr;

    while (isRunning && addrPtr < MEMORY_SIZE) {
      const opcode = memory[addrPtr++];
      switch (opcode) {
        case 0x0: // KA: K->Ar (Simplified: skip waiting for keypress)
          // No key input, flag=1. Hardware reads keyboard, we just set flag.
          flag = 1;
          break;
        case 0x1: // AO: Ar->Op (Display register A)
          updateDisplay(regA);
          flag = 1;
          break;
        case 0x4: // AM: Ar->M (Write to data memory)
          memory[DATA_MEMORY_START + regY] = regA & NIBBLE_MASK;
          flag = 1;
          break;
        case 0x5: // MA: M->Ar (Read from data memory)
          regA = memory[DATA_MEMORY_START + regY] & NIBBLE_MASK;
          flag = 1;
          break;
        case 0x6: // M+: M + Ar -> Ar (with carry flag)
          {
            const val = memory[DATA_MEMORY_START + regY] & NIBBLE_MASK;
            const sum = regA + val;
            regA = sum & NIBBLE_MASK;
            flag = sum > NIBBLE_MASK ? 1 : 0;
          }
          break;
        case 0x7: // M-: M - Ar -> Ar (with borrow flag)
          {
            const val = memory[DATA_MEMORY_START + regY] & NIBBLE_MASK;
            const diff = val - regA;
            regA = (diff + 0x10) & NIBBLE_MASK; // 2's complement
            flag = diff < 0 ? 1 : 0;
          }
          break;
        case 0x8: // TIA [ ]: Immediate -> Ar
          if (addrPtr < MEMORY_SIZE) {
            regA = memory[addrPtr++] & NIBBLE_MASK;
            flag = 1;
          }
          break;
        case 0x9: // AIA [ ]: Ar + Immediate -> Ar
          if (addrPtr < MEMORY_SIZE) {
            const imm = memory[addrPtr++] & NIBBLE_MASK;
            const sum = regA + imm;
            regA = sum & NIBBLE_MASK;
            flag = sum > NIBBLE_MASK ? 1 : 0;
          }
          break;
        case 0xA: // TIY [ ]: Immediate -> Yr
          if (addrPtr < MEMORY_SIZE) {
            regY = memory[addrPtr++] & NIBBLE_MASK;
            flag = 1;
          }
          break;
        case 0xB: // AIY [ ]: Yr + Immediate -> Yr
          if (addrPtr < MEMORY_SIZE) {
            const imm = memory[addrPtr++] & NIBBLE_MASK;
            const sum = regY + imm;
            regY = sum & NIBBLE_MASK;
            flag = sum > NIBBLE_MASK ? 1 : 0;
          }
          break;
        case 0xC: // CIA [ ]: Ar != [ ] ? set flag
          if (addrPtr < MEMORY_SIZE) {
            const imm = memory[addrPtr++] & NIBBLE_MASK;
            flag = (regA !== imm) ? 1 : 0;
          }
          break;
        case 0xD: // CIY [ ]: Yr != [ ] ? set flag
          if (addrPtr < MEMORY_SIZE) {
            const imm = memory[addrPtr++] & NIBBLE_MASK;
            flag = (regY !== imm) ? 1 : 0;
          }
          break;
        case 0xE: // Extended opcodes (CAL)
          if (addrPtr < MEMORY_SIZE) {
            const subCode = memory[addrPtr++] & NIBBLE_MASK;
            switch (subCode) {
              case 0x0: // CAL RSTO: Reset 7-seg display
                updateDisplay(0);
                break;
              case 0x1: // CAL SETR: Turn on 2-pin LED at index Y
                clear2PinLEDs();
                set2PinLED(regY, true);
                break;
              case 0x2: // CAL RSTR: Turn off 2-pin LED at index Y
                set2PinLED(regY, false);
                break;
              case 0x4: // CAL CMPL: Complement register A
                regA = (~regA) & NIBBLE_MASK;
                break;
              case 0x7: // CAL ENDS: Play end sound
                playLongPi();
                break;
              case 0x8: // CAL ERRS: Play error sound
                playShortPi();
                playShortPi();
                break;
              case 0x9: // CAL SHTS: Play short sound
                playShortPi();
                break;
              case 0xA: // CAL LONS: Play long sound
                playLongPi();
                break;
              case 0xB: // CAL SUND: Play note from register A (1-E)
                playNote(regA);
                break;
              case 0xC: // CAL TIMR: Pause for (A+1)*0.1 seconds
                await sleep((regA + 1) * 100);
                break;
              case 0xD: // CAL DSPR: Set 2-pin LEDs from memory 5F(hi 3), 5E(lo 4)
                {
                  const upper = memory[DATA_MEMORY_END] & 0x07; // 3 bits
                  const lower = memory[DATA_MEMORY_END - 1] & NIBBLE_MASK; // 4 bits
                  const val = (upper << 4) | lower;
                  set2PinLEDsFromByte(val);
                }
                break;
              case 0xE: // CAL DEM-: M[Y] - A -> M[Y], Y--
                {
                  const addr = DATA_MEMORY_START + regY;
                  const val = memory[addr] & NIBBLE_MASK;
                  const result = val - regA;
                  memory[addr] = (result + 0x10) & NIBBLE_MASK; // Handle borrow
                  regY = (regY - 1 + 0x10) & NIBBLE_MASK; // Decrement Y with wrap-around
                  flag = 1;
                }
                break;
              case 0xF: // CAL DEM+: M[Y] + A -> M[Y], Y--
                {
                  const addr = DATA_MEMORY_START + regY;
                  const val = memory[addr] & NIBBLE_MASK;
                  const sum = val + regA;
                  memory[addr] = sum & NIBBLE_MASK;
                  if (sum > NIBBLE_MASK) { // On overflow, increment M[Y-1]
                    const prevAddr = DATA_MEMORY_START + ((regY - 1 + 0x10) & NIBBLE_MASK);
                    memory[prevAddr] = (memory[prevAddr] + 1) & NIBBLE_MASK;
                  }
                  regY = (regY - 1 + 0x10) & NIBBLE_MASK; // Decrement Y with wrap-around
                  flag = 1;
                }
                break;
              default:
                // Other subcodes not implemented
                break;
            }
          }
          break;
        case 0xF: // JUMP [hi][lo]
          if (addrPtr + 1 < MEMORY_SIZE) {
            const hi = memory[addrPtr++] & NIBBLE_MASK;
            const lo = memory[addrPtr++] & NIBBLE_MASK;
            const jumpAddr = (hi << 4) | lo;
            if (flag === 1) {
              addrPtr = jumpAddr;
            }
            flag = 1;
          }
          break;
        default:
          // Unknown instruction, stop execution
          isRunning = false;
          break;
      }

      updateAddressLEDs(addrPtr);
      updateRegisters();
      // updateDisplay(regA); // Display is often explicitly controlled by instructions

      updateProgramView();

      // Delay for visualization
      await sleep(180);
    }
    isRunning = false;
  }

  function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // --- Initialization ---
  function init() {
    setupControls();
    hardResetMachine();
  }

  init();

})();
