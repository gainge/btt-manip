import { findSeedDifference, formatHex, rngAdv, rngInt } from './util.js';
import { MANIP_ACTIONS, STAGE_LOAD_ACTION, buildActionSequence } from './rolls.js';
import { EVENT_SEARCH_MAX_ITERATIONS, searchForEvent, buildCharacterEvents, buildPullEventList } from './event.js';


const SERVER = '';
const PORT = '';

/* Constants */
const STOCK_ICONS = [
	"../img/DrMarioBlack.png",
	"../img/MarioOriginal.png",
	"../img/LuigiOriginal.png",
	"../img/BowserOriginal.png",
	"../img/PeachOriginal.png",
	"../img/YoshiOriginal.png",
	"../img/DonkeyKongOriginal.png",
	"../img/CaptainFalconOriginal.png",
	"../img/GanondorfOriginal.png",
	"../img/FalcoOriginal.png",
	"../img/FoxOriginal.png",
	"../img/NessOriginal.png",
	"../img/IceClimbersOriginal.png",
	"../img/KirbyOriginal.png",
	"../img/SamusOriginal.png",
	"../img/ZeldaOriginal.png",
	"../img/LinkGreen.png",
	"../img/YoungLinkGreen.png",
	"../img/PichuOriginal.png",
	"../img/PikachuOriginal.png",
	"../img/JigglyPuffOriginal.png",
	"../img/MewtwoOriginal.png",
	"../img/Game & Watch Original.png",
	"../img/MarthOriginal.png",
	"../img/RoyOriginal.png",
];

const CSS_ICONS = [
  [
    "./img/css_doc.png",
    "img/css_mario.png",
    "../img/css_luigi.png",
    "../img/css_bowser.png",
    "../img/css_peach.png",
    "../img/css_yoshi.png",
    "../img/css_dk.png",
    "../img/css_falcon.png",
    "../img/css_ganon.png",
  ],
  [
    "../img/css_falco.png",
    "../img/css_fox.png",
    "../img/css_ness.png",
    "../img/css_ICs.png",
    "../img/css_kirby.png",
    "../img/css_samus.png",
    "../img/css_zelda.png",
    "../img/css_link.png",
    "../img/css_yl.png",
  ],
  [
    "",
    "../img/css_pichu.png",
    "../img/css_pika.png",
    "../img/css_puff.png",
    "../img/css_m2.png",
    "../img/css_gnw.png",
    "../img/css_marth.png",
    "../img/css_roy.png",
    "",
  ],
];

const FIRST_SEARCH_MAX_CHARS = 9;
const FIRST_SEARCH_MIN_CHARS = 9;
const SUCCESSIVE_SEARCH_MAX_CHARS = 9;
const SUCCESSIVE_SEARCH_MIN_CHARS = 4; // Might need to be 5... lol, we'll test




/* State Variables */
let charSeq = [];
let isFirstSearch = true;
let lastSeed = -1;


function reset(forceReset = false) {
  if (forceReset || confirm('Reset current seed and begin new search?')) {
    // Reset state data
    charSeq = [];
    isFirstSearch = true;
    lastSeed = -1;

    // Clear UI
    clearSeq();
    clearResults();
  }
}


function addActionLine(parent, text) {
  let p = document.createElement('p');
  p.classList.add('action-line')
  p.innerHTML = text;

  parent.appendChild(p)
}


function printAction(parent, action, count) {
  addActionLine(parent, `${count} - ${action.label} (${action.rolls})`);
}



function displayActionSequence(actionSequence, rolls) {
  let actionsBlock = document.getElementById('actions');

  let numActions = 0;
  for (let value of actionSequence.values()) {
    numActions += value;
  }

  // Print header
  addActionLine(actionsBlock, '----------------------------------');
  addActionLine(actionsBlock, `Achievable in ${numActions} action${numActions == 1 ? '' : 's'}`);
  addActionLine(actionsBlock, '----------------------------------');
  addActionLine(actionsBlock, `Target: ${rolls} rolls`);
  
  actionsBlock.appendChild(document.createElement('br'));


  // Always attempt to print the stage loads first if applicable
  if (actionSequence.get(STAGE_LOAD_ACTION)) {
    let key = STAGE_LOAD_ACTION;
    let value = actionSequence.get(STAGE_LOAD_ACTION);
    printAction(actionsBlock, key, value);
  }

  for (let [key, value] of actionSequence.entries()) {
    if (key == STAGE_LOAD_ACTION) continue;
    printAction(actionsBlock, key, value);
  }
}


function buildCharIconList() {
  let parent = document.getElementById('char-seq-container');
  parent.innerHTML = '';

  for (let i = 0; i < charSeq.length; i++) {
    let characterIndex = charSeq[i];

    let icon = document.createElement('img');
    icon.classList.add('stock-icon');
    icon.setAttribute('src', STOCK_ICONS[characterIndex]);

    parent.appendChild(icon);
  }
}

function updateCharSeqDisplay() {
  let count = document.getElementById('character-count');

  let max = isFirstSearch ? FIRST_SEARCH_MAX_CHARS : SUCCESSIVE_SEARCH_MAX_CHARS;
  let min = isFirstSearch ? FIRST_SEARCH_MIN_CHARS : SUCCESSIVE_SEARCH_MIN_CHARS;

  count.innerHTML = `${charSeq.length}/${min}`;

  // Update color based on state
  count.classList.remove('empty-count');
  count.classList.remove('partial-count');
  count.classList.remove('full-count');

  if (charSeq.length == 0) {
    count.classList.add('empty-count');
  } else if (charSeq.length < min) {
    count.classList.add('partial-count');
  } else {
    count.classList.add('full-count');
  }

  // Also update the button here
  let searchButton = document.getElementById('search-button');
  searchButton.disabled = (charSeq.length < min);
}


function addCharToSeq(characterIndex) {
  // check for super long sequences I guess
  if (charSeq.length > 9) {
    return;
  }

  console.log('adding character: ' + characterIndex);

  // Add to index array
  charSeq.push(characterIndex);

  // Add element to page
  buildCharIconList();

  // Update character count
  updateCharSeqDisplay();
}

function undoChar() {
  // Remove last char and refresh UI
  charSeq.pop();

  buildCharIconList();
  updateCharSeqDisplay();
}


function clearSeq() {
  charSeq = [];

  let parent = document.getElementById('char-seq-container');
  parent.innerHTML = ""; // Clear that sucka

  // Clear character count
  updateCharSeqDisplay();
}

function clearResults() {
  // Clear results display
  document.getElementById('seed-span').innerHTML = '';
  document.getElementById('summary').innerHTML = '';
  document.getElementById('actions').innerHTML = '';
}

function displaySearchResult(parent, searchResult) {
  parent.appendChild(document.createTextNode('Event Seed: 0x' + formatHex(searchResult.eventSeed)));
  parent.appendChild(document.createElement('br'));
  parent.appendChild(document.createTextNode('0x' + formatHex(searchResult.startSeed) + ' => 0x' + formatHex(searchResult.eventSeed)));
  parent.appendChild(document.createElement('br'));
  parent.appendChild(document.createTextNode('Interval: ' + searchResult.interval));

  // Log for funsies
  console.log('Event Seed: ' + formatHex(searchResult.eventSeed));
  console.log('End Seed: ' + formatHex(searchResult.endSeed));
  console.log('Interval: ' + searchResult.interval);
}


// Found seed, now to search for an event
function processSeed(seed) {
  let seedSpan = document.getElementById('seed-span');

  // Handle success
  if (seed >= 0) {
    // Store result in application state
    lastSeed = seed;

    // Display the Seed
    let seedString = formatHex(seed);
    console.log(seedString);
    seedSpan.innerHTML = '0x' + seedString;

    // Search for target event
    let aerialSpawn = document.getElementById('aerial-spawn-checkbox').checked;
    let selectedItem = document.querySelector('input[name="item"]:checked').value;
    let events = buildPullEventList(aerialSpawn, selectedItem);
    let searchResult = searchForEvent(events, seed);

    // Clear summary block for result
    let summary = document.getElementById('summary');
    summary.innerHTML = '';

    if (searchResult.success) {
      displaySearchResult(summary, searchResult);

      // TODO: handle IBG for spawn load stuff lol
      let actionSequence = buildActionSequence(searchResult.interval);

      displayActionSequence(actionSequence, searchResult.interval);
    } else {
      // Bummer dude
      alert(`Event not found within ${EVENT_SEARCH_MAX_ITERATIONS} seeds`);
    }
  } else {
    clearResults();
    seedSpan.innerHTML = 'Not Found';
    alert('Seed not found');
    reset(true);
  }

  // Clear character sequence
  clearSeq();
}



function searchForSeed() {
  // First search?
  if (isFirstSearch) {
    searchForNewSeed();
    isFirstSearch = false; // Update flag for future
    return;
  }

  // Validate char seq length
  if (charSeq.length < SUCCESSIVE_SEARCH_MIN_CHARS) {
    alert('Please enter more characters');
  }
  
  // Do our own search with the char seq!
  let characterEvents = buildCharacterEvents(charSeq);

  // Find next seed using characters + last seed detected
  let searchResult = searchForEvent(characterEvents, lastSeed);

  clearResults();
  if (searchResult.success) {
    // Extract the current seed from the character sequence search
    let seed = searchResult.endSeed;

    processSeed(seed);
  } else {
    alert(`Character sequence not found after searching ${EVENT_SEARCH_MAX_ITERATIONS} seeds`);
  }
}


function searchForNewSeed() {
  // check sequence
  if (charSeq.length < 1) {
    alert('Please enter a character sequence!');
    return;
  } else if (charSeq.length < FIRST_SEARCH_MIN_CHARS) {
    alert(`First character sequence must be at least ${FIRST_SEARCH_MIN_CHARS} chararacters long!`);
    return;
  }

  console.log("I'm a searchin'!");

  // Build the URL I guess lol
  let url = `${SERVER}:${PORT}/seed`;
  let arraySpecifier = 'seq[]';

  for (let i = 0; i < charSeq.length; i++) {
    if (i == 0) {
      url = url + '?'
    } else {
      url = url + '&'
    }

    url = url + arraySpecifier + '=' + charSeq[i];
  }

  fetch(url)
      .then(function (response) {
        if (!response.ok) {
          throw new Error(`Status Code: ${response.status} `);
        }
        console.log(response);
        return response.json();
      }).then(function (result) {
        clearResults();
        let seed = result.seed

        processSeed(seed);
      }).catch(function(error) {
        alert(`Error Executing Search. ${error}`);
        console.log("Fetch error: " + error);
      });

}




function buildCSS() {
  let container = document.getElementById('css');

  let count = 0;

  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 9; col++) {
      let icon = document.createElement('img');
      icon.classList.add('css-icon');

      if (row == 2 && (col == 0 || col == 8)) {
        // Random space, hide element and move on
        icon.classList.add('hidden');
      } else {
        icon.setAttribute('src', CSS_ICONS[row][col]);
        
        // Set callback
        icon.onclick = (function(n) {
          return () => addCharToSeq(n);
        })(count);

        count++; // Increment 
      }

      container.appendChild(icon);
    }
  }

}



// build the UI lol
buildCSS();

window.searchForSeed = searchForSeed;
window.undoChar = undoChar;
window.clearSeq = clearSeq;
window.reset = reset;