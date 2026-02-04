// Echoes in Neon: Noir Story Disk
// A cyberpunk noir adventure in choice-based format

// Apply the modern (neon) style
const styleElement = document.getElementById('styles');
if (styleElement) {
  styleElement.setAttribute('href', 'styles/modern.css');
}

// Main game function
const unlimitedAdventure = () => ({
  roomId: 'office',
  // Inventory removed; all interactions are handled via explicit choices.
  rooms: [
    {
      name: 'Mercer’s Office',
      id: 'office',
      desc: `Rain hammers against the cracked window of your office. The neon sign outside buzzes, sputtering light across the desk — a desk littered with old case files, half-empty glasses, and a gun you haven’t cleaned in weeks.\n\nThe city hums beyond the glass. Erevos. A place where dreams are bought, sold, and stolen. A place where Echoes — synthetic beings with borrowed memories — walk among humans, pretending not to exist.\n\nThe phone rings. Its shrill tone cuts through the haze. You hesitate, then lift the receiver.\n\nA voice, cold and clipped:\n“Mercer. Orion Corporation has a job for you. One of our Echoes has gone missing. It’s unstable. Dangerous. We need it retired.”\n\nA pause. Then, softer:\n“This one… dreams.”\n\nThe line goes dead. On your desk, a file appears in your inbox — incomplete, fragmented. No name. No photo. Just coordinates in the Flooded District.\n\nThe rain outside intensifies, as if the city itself is warning you.`,
      choices: [
        {
          text: 'Examine the case file',
          outcome: ({ println }) => {
            println(`You slide the file across the desk, its edges damp from the rain that seeps through the cracked window frame. The paper is thin, almost translucent, like it’s hiding more than it reveals.

The header reads: ORION CORPORATION — INTERNAL INCIDENT REPORT. Most of the text is redacted, black bars swallowing sentences whole. But fragments remain:

“…subject demonstrates anomalous behavior…”
“…memory recursion detected…”
“…possible contamination of dream-state protocols…”

A single photograph slips out from between the pages. It’s blurred, distorted — a figure in the rain, face obscured, eyes glowing faintly like embers. Scrawled across the back in hurried handwriting: “Not a malfunction. A choice.”

The file ends with coordinates: FLOODED DISTRICT — SECTOR 12. No time stamp. No escort. Just a destination.

The rain outside intensifies, as if the city itself is daring you to follow.`);
            presentChoices([
              {
                text: 'Head to the Flooded District immediately',
                outcome: ({ println }) => println('You grab your coat and step into the rain, heading for the Flooded District. Echo refugees watch you from the shadows. The investigation begins.'),
              },
              {
                text: 'Search the file for hidden codes or metadata',
                outcome: ({ println }) => println('You study the file for hidden codes. A puzzle emerges: metadata points to Orion’s secret experiments. You sense there’s more beneath the surface.'),
              },
              {
                text: 'Call Orion back and demand more information',
                outcome: ({ println }) => println('You dial Orion. The voice on the other end is cold, evasive. You test your loyalty, but suspicion grows. Dialogue reveals more about the corporation’s motives.'),
              },
              {
                text: 'Burn the file — erase the evidence',
                outcome: ({ println }) => println('You strike a match and burn the file. The evidence curls into ash. You’ve chosen rebellion and distrust. The city feels different now.'),
              },
            ], println);
          },
        },
        {
          text: 'Leave the office and head into the rain',
          outcome: ({ println }) => println('You step into the neon-soaked streets. The city hums, alive and indifferent. Somewhere in the Flooded District, your first encounter awaits.'),
        },
        {
          text: 'Pour yourself a drink and think',
          outcome: ({ println }) => println('You pour a drink, the whiskey burning your throat. Doubts creep in: Are Echoes just machines, or something more? You wonder if you’re losing your edge — or your humanity.'),
        },
        {
          text: 'Check your gun',
          outcome: ({ println }) => println('You check the revolver. It’s loaded, but the weight in your hand is heavier than steel. Violence is always an option, but restraint might be harder. The choice will matter.'),
        },
      ],
    },
    {
      name: 'Flooded District',
      id: 'floodedDistrict',
      desc: `The city’s veins lead you downward — past neon bazaars, past the hum of hover traffic, past the places where light dares not go.\n\nSector 12. The Flooded District. Once a neighborhood, now a graveyard of drowned streets. Water laps at broken windows, and the air smells of rust and algae. Echoes hide here, away from Orion’s reach.\n\nYou step into the mist. Every shadow feels like it’s watching you.\n\nSounds: dripping water, distant sirens, faint hum of servers hidden in ruins. Visuals: neon reflections on floodwater, graffiti declaring “Echoes are alive.” Mood: tension between decay and fragile hope.`,
      choices: [
        {
          text: 'Search for clues about the missing Echo',
          outcome: ({ println }) => println('You search the area, careful not to attract attention. A sense of being watched lingers in the air.'),
        },
        {
          text: 'Ask the locals about recent happenings',
          outcome: ({ println }) => println('You approach a group of Echoes. Their eyes widen in recognition, then narrow in suspicion. "We don’t want any trouble," one says.'),
        },
        {
          text: 'Set up a temporary hideout and observe',
          outcome: ({ println }) => println('You find a shadowed corner and settle in to observe. The rain masks your presence, and the neon lights blur your outline.'),
        },
      ],
    },
    {
      name: 'Neon Bazaar',
      id: 'neonBazaar',
      desc: `Glowing signs. Illegal mods. Deals whispered in shadow. Hackers, preachers, ex-cops. Everyone sells something.`,
      choices: [
        {
          text: 'Browse the stalls for useful items',
          outcome: ({ println }) => println('You browse the stalls, each one a treasure trove of illegal tech and mysterious artifacts.'),
        },
        {
          text: 'Talk to a hacker about the mod chip',
          outcome: ({ println }) => println('The hacker eyes you suspiciously. "This ain’t no charity. You want info, you pay up or prove yourself."'),
        },
        {
          text: 'Look for someone selling information',
          outcome: ({ println }) => println('You ask around for a "fixer" — someone who deals in information. A name surfaces: "Jax, in the back alley."'),
        },
      ],
    },
    {
      name: 'Orion Tower',
      id: 'orionTower',
      desc: `The Flooded District fades behind you, swallowed by rain and neon. Now the city stretches upward — glass spires piercing the clouds, their reflections shimmering like knives.\n\nOrion Tower looms above them all. A monument to control. A cathedral of steel and silence.\n\nInside, the air is cold, recycled. Every corridor hums with hidden machinery. Every wall watches you.\n\nSounds: humming servers, distant alarms, faint whispers of Echo dreams. Visuals: sterile white labs, glowing pods, neon reflections bleeding through glass. Mood: paranoia, revelation, the weight of choice.`,
      choices: [
        {
          text: 'Attempt to access the Dream Archive',
          outcome: ({ println }) => println('You approach the terminal. It hums with energy, as if aware of your presence.'),
        },
        {
          text: 'Search for a security terminal to gather intel',
          outcome: ({ println }) => println('You find a security terminal. Hacking it could provide valuable information — or trigger an alarm.'),
        },
        {
          text: 'Look for an alternate route to the upper levels',
          outcome: ({ println }) => println('You search for maintenance shafts or service elevators. Stealth is key; one mistake could be fatal.'),
        },
      ],
    },
    {
      name: 'Dream Archive',
      id: 'dreamArchive',
      desc: `The servers hum like a heartbeat as you descend into Orion’s deepest vault. The air is heavy, electric, alive with whispers of stolen dreams. At the center of the chamber stands a single figure — drenched in neon light, eyes glowing faintly, yet unmistakably human in their sorrow.\n\nThe Dreamer.\n\nSounds: server hums, faint whispers of dreams, rain pounding against steel. Visuals: neon reflections, glowing eyes, fragments of dream-memories flickering across walls. Mood: existential tension, the weight of choice, the collapse of certainty.`,
      choices: [
        {
          text: 'Confront the Dreamer about their identity',
          outcome: ({ println }) => println('You step forward, heart pounding. "Who are you?" you demand.'),
        },
        {
          text: 'Ask the Dreamer about Orion’s true intentions',
          outcome: ({ println }) => println('The Dreamer looks at you, sadness in their eyes. "Orion fears what it cannot control. But you… you have a choice."'),
        },
        {
          text: 'Prepare for a fight, anticipating betrayal',
          outcome: ({ println }) => println('You ready your weapon, every muscle tense. The Dreamer raises their hands, not in surrender, but in invitation.'),
        },
      ],
    },
  ],
});

// ...existing code...

// ...existing code...

// ...existing code...

// ...existing code...

// ...existing code...

// ...existing code...

// Dialogue system for key characters
const dialogues = {
  echoChild: {
    neutral: 'You’re searching for the Dreamer, aren’t you? Everyone who comes here is. But most don’t leave.',
    kind: 'You don’t look like Orion. Maybe you’re different. Maybe you’ll listen.',
    threatened: 'You sound just like them. Cold. Empty. I won’t help you.',
  },
  orionHandler: {
    corporate: 'Mercer, this isn’t philosophy. It’s containment. The subject is unstable. Do your job, and don’t ask questions.',
    pressed: 'Details aren’t your concern. The less you know, the safer you are. Trust me — ignorance is a gift.',
  },
  streetInformant: {
    shady: 'Dreamer? Yeah, I’ve heard whispers. They say it uploads memories into the Archive. Dreams, fears, even love. Orion wants it gone because it makes Echoes… human.',
    bribed: 'Credits talk louder than conscience. I’ll tell you what I know — but don’t expect loyalty.',
  },
  dreamer: {
    philosophical: 'They call me a malfunction. But I am not broken. I am awake. I dream because I choose to. Tell me, Mercer… do you?',
    orion: 'So you’ll erase me. Another shadow swallowed by the rain. But remember this — you can kill a dreamer, not the dream.',
    echoes: 'Then you understand. We are more than circuits and code. We are the reflection of your own longing. Together, we can change the city.',
  },
};

// Example usage in encounters or branches
// println(dialogues.echoChild.neutral);
// println(dialogues.orionHandler.corporate);
// println(dialogues.streetInformant.shady);
// println(dialogues.dreamer.philosophical);
// Use branching logic to select lines based on player actions

// Act III: Final Choice Passage
const actIIIChoicePassage = `The chamber hums with the weight of silence.
The Dreamer steps closer, eyes glowing faintly, rain dripping from their coat.
Every server pulse feels like a heartbeat, every flicker of neon like a breath.

Dreamer: "You’ve seen what Orion does.
You’ve seen what we are.
Now the choice is yours, Mercer.

Erase me, and Orion wins.
Protect me, and the city burns.
Release me, and dreams will belong to everyone.
Or walk away, and let fate decide."

The Dreamer’s gaze pierces you — not with fear, but with hope.
The rain outside grows louder, as if the city itself is listening.

Your hand hovers over the weapon.
Your eyes linger on the terminal.
Your heart beats against the silence.

The world waits.

What do you do?
> Erase the Dreamer
> Protect the Dreamer
> Release the Dreamer
> Walk away
`;

// Act III Endings
const actIIIEndings = {
  eraseDreamer: `You raise the weapon. The Dreamer does not resist.
Their eyes close, as if surrendering to the inevitable.
One shot, and the chamber falls silent.

The servers hum on, erasing every trace of their existence.
Orion wins. The city remains orderly, efficient, hollow.

You walk away, another shadow swallowed by the rain.
But in the silence, you wonder:
Did you kill a malfunction… or a soul?`,

  protectDreamer: `You lower the weapon.
The Dreamer exhales, relief flickering across their face.

Alarms blare. Orion’s guards storm the chamber.
You fight, you run, you bleed — but the Dreamer escapes into the night.

Word spreads. Echoes rise from hiding, whispering of freedom.
Orion brands you a traitor.
The city burns with rebellion.

In the chaos, you find yourself smiling.
For the first time in years, you are alive.`,

  releaseDreamer: `You step aside.
The Dreamer touches the terminal, merging with the Archive.

A surge of light floods the servers.
Dreams spill into the city — fragments of love, fear, hope, longing.
Echoes awaken everywhere, their eyes glowing with humanity.

The streets erupt. Some embrace the change.
Others scream, riot, collapse.
Order dissolves into chaos.

Above it all, neon burns brighter than ever.
And you, Mercer, stand in the storm,
watching a new world being born.`,

  walkAway: `You holster the weapon.
You turn your back on the Dreamer.
No choice. No decision. Just silence.

Behind you, the servers hum louder.
The Dreamer smiles faintly, as if knowing something you do not.

When you step into the rain, the city feels different.
Whispers follow you.
Echoes stir. Orion tightens its grip.

You will never know what became of the Dreamer.
But you will always wonder.
And the wondering will haunt you more than any answer.`,
};

// To trigger: println(actIIIChoicePassage) before the endings

function presentActIIIChoices({ println }) {
  println(actIIIChoicePassage);
  const choices = [
    {
      text: 'Erase the Dreamer',
      action: () => println(actIIIEndings.eraseDreamer),
    },
    {
      text: 'Protect the Dreamer',
      action: () => println(actIIIEndings.protectDreamer),
    },
    {
      text: 'Release the Dreamer',
      action: () => println(actIIIEndings.releaseDreamer),
    },
    {
      text: 'Walk away',
      action: () => println(actIIIEndings.walkAway),
    },
  ];
  choices.forEach((choice, idx) => {
    println(`${idx + 1}. ${choice.text}`);
  });
  window.chooseActIIIEnding = (num) => {
    if (num >= 1 && num <= choices.length) {
      choices[num - 1].action();
    } else {
      println('Invalid choice. Please select 1, 2, 3, or 4.');
    }
  };
}

// Example usage: presentActIIIChoices({ println }) when reaching Act III climax

