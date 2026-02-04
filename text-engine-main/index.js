// Choice-based Text Adventure Engine
// Fully refactored for branching-choice gameplay

let diskFactory;
let disk;
let printQueue = [];
let bullet = '•';

// Get references to DOM elements
let output = document.querySelector('#output');
let input = document.querySelector('#input');

// Print text to the output area
let println = (text, className = '') => {
  if (!text) return;

  const p = document.createElement('p');

  if (className) {
    p.className = className;
  }

  // Handle markdown-style bold
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

  p.innerHTML = text;
  output.appendChild(p);

  // Auto-scroll to bottom
  output.scrollTop = output.scrollHeight;
};

// Clear the output
let clear = () => {
  output.innerHTML = '';
};

// Get room by ID
let getRoom = (roomId) => {
  return disk.rooms.find(room => room.id === roomId);
};

// Enter a room and display its content
let enterRoom = (roomId) => {
  const room = getRoom(roomId);

  if (!room) {
    println('Error: Room not found.');
    return;
  }

  // Update current room
  disk.roomId = roomId;

  // Display room name
  println(`\n=== ${room.name} ===\n`, 'room-title');

  // Display room description
  println(room.desc);

  // Present choices if available
  if (room.choices && room.choices.length > 0) {
    println('\n**What do you do?**\n');
    room.choices.forEach((choice, idx) => {
      println(`${idx + 1}. ${choice.text}`, 'choice');
    });

    // Set up choice handler
    window.currentChoices = room.choices;
  } else {
    println('\n[No choices available]');
  }
};

// Handle user input (numeric choice selection)
let applyInput = () => {
  const value = input.value.trim();
  input.value = '';

  if (!value) return;

  // Echo user input
  println(`\n> ${value}\n`, 'user-input');

  // Parse as number
  const choiceNum = parseInt(value, 10);

  if (isNaN(choiceNum)) {
    println('Please enter a number to select your choice.');
    return;
  }

  // Check if we have active choices
  if (!window.currentChoices || window.currentChoices.length === 0) {
    println('No choices available at this time.');
    return;
  }

  // Validate choice
  if (choiceNum < 1 || choiceNum > window.currentChoices.length) {
    println(`Invalid choice. Please select a number between 1 and ${window.currentChoices.length}.`);
    return;
  }

  // Execute the chosen option
  const choice = window.currentChoices[choiceNum - 1];

  if (choice.outcome) {
    choice.outcome({ println, getRoom, enterRoom, disk });
  } else if (choice.action) {
    choice.action({ println, getRoom, enterRoom, disk });
  } else {
    println('This choice has no outcome defined.');
  }
};

// Initialize the disk and start the game
let loadDisk = (diskFunction) => {
  // Clear previous game state
  clear();

  // Store the disk factory
  diskFactory = diskFunction;

  // Initialize the disk
  if (typeof diskFunction === 'function') {
    disk = diskFunction();
  } else {
    disk = diskFunction;
  }

  // Initialize room visits
  if (disk.rooms) {
    disk.rooms = disk.rooms.map((room) => {
      room.visits = 0;
      return room;
    });
  }

  // Display welcome message
  println('='.repeat(60));
  println('ECHOES IN NEON', 'title');
  println('A Cyberpunk Noir Adventure');
  println('='.repeat(60));
  println('\nEnter the number of your choice and press ENTER.\n');

  // Start the game
  if (disk.roomId) {
    enterRoom(disk.roomId);
  } else {
    println('Error: No starting room defined.');
  }
};

// Setup input listeners
let setup = () => {
  // Handle Enter key
  input.addEventListener('keypress', (e) => {
    if (e.keyCode === 13 || e.key === 'Enter') {
      applyInput();
    }
  });

  // Keep input focused
  input.addEventListener('blur', () => {
    setTimeout(() => input.focus(), 0);
  });

  // Focus input on page load
  input.focus();
};

// Run setup when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
