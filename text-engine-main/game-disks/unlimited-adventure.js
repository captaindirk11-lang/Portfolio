// Echoes in Neon: Noir Story Disk
// A cyberpunk noir adventure in pure choice-based format

// Apply the modern (neon) style
const styleElement = document.getElementById('styles');
if (styleElement) {
  styleElement.setAttribute('href', 'styles/modern.css');
}

// Main game function
const unlimitedAdventure = () => ({
  roomId: 'office',
  rooms: [
    {
      name: 'Mercer\'s Office',
      id: 'office',
      desc: `Rain hammers against the cracked window of your office. The neon sign outside buzzes, sputtering light across the desk — a desk littered with old case files, half-empty glasses, and a gun you haven't cleaned in weeks.

The city hums beyond the glass. **Erevos**. A place where dreams are bought, sold, and stolen. A place where Echoes — synthetic beings with borrowed memories — walk among humans, pretending not to exist.

The phone rings. Its shrill tone cuts through the haze. You hesitate, then lift the receiver.

A voice, cold and clipped:
**"Mercer. Orion Corporation has a job for you. One of our Echoes has gone missing. It's unstable. Dangerous. We need it retired."**

A pause. Then, softer:
**"This one… dreams."**

The line goes dead. On your desk, a file appears in your inbox — incomplete, fragmented. No name. No photo. Just coordinates in the Flooded District.

The rain outside intensifies, as if the city itself is warning you.`,
      choices: [
        {
          text: 'Examine the case file',
          outcome: ({ println, enterRoom }) => {
            println(`You slide the file across the desk, its edges damp from the rain. The paper is thin, almost translucent.

The header reads: **ORION CORPORATION — INTERNAL INCIDENT REPORT**. Most of the text is redacted, black bars swallowing sentences whole. But fragments remain:

"…subject demonstrates anomalous behavior…"
"…memory recursion detected…"
"…possible contamination of dream-state protocols…"

A single photograph slips out. It's blurred, distorted — a figure in the rain, face obscured, eyes glowing faintly like embers. Scrawled across the back in hurried handwriting: **"Not a malfunction. A choice."**

The file ends with coordinates: **FLOODED DISTRICT — SECTOR 12**.

The rain outside intensifies, as if the city itself is daring you to follow.`);
            setTimeout(() => enterRoom('fileExamined'), 1500);
          },
        },
        {
          text: 'Leave the office and head into the rain',
          outcome: ({ println, enterRoom }) => {
            println('You grab your coat without hesitation. The neon-soaked streets call to you. Somewhere in the Flooded District, answers await.');
            setTimeout(() => enterRoom('floodedDistrict'), 1500);
          },
        },
        {
          text: 'Pour yourself a drink and think',
          outcome: ({ println }) => {
            println(`You pour a drink, the whiskey burning your throat. The amber liquid catches the neon light.

Doubts creep in: Are Echoes just machines, or something more? The corporation says one thing, but the streets say another.

You wonder if you're losing your edge — or your humanity.

The phone rings again. Orion doesn't like to be kept waiting.`);
          },
        },
        {
          text: 'Check your gun',
          outcome: ({ println }) => {
            println(`You check the revolver. Six rounds. Fully loaded.

The weight in your hand is heavier than steel. Violence is always an option, but in this city, restraint might be harder.

The choice will matter. It always does.`);
          },
        },
      ],
    },
    {
      name: 'File Examined',
      id: 'fileExamined',
      desc: `You've read what Orion wants you to see. But something feels wrong. The redactions, the photo, the handwritten note — all point to something deeper.

The coordinates glow on your screen. The Flooded District awaits.`,
      choices: [
        {
          text: 'Head to the Flooded District immediately',
          outcome: ({ println, enterRoom }) => {
            println('Decision made. You grab your coat and step into the rain. The investigation begins now.');
            setTimeout(() => enterRoom('floodedDistrict'), 1500);
          },
        },
        {
          text: 'Search the file for hidden metadata',
          outcome: ({ println, enterRoom }) => {
            println(`You pull out your datapad and scan the file. Fragments of code emerge:

**CLASSIFICATION: SENTINEL-OMEGA**
**SUBJECT: UNIT-177 "DREAMER"**
**STATUS: ROGUE - CONTAINMENT BREACH**

This isn't just a missing Echo. This is something Orion fears.`);
            setTimeout(() => enterRoom('floodedDistrict'), 2000);
          },
        },
        {
          text: 'Call Orion back and demand more information',
          outcome: ({ println }) => {
            println(`You dial the number. It rings once before connecting.

**"Mercer,"** the voice is ice, **"your questions are noted. And ignored. Do the job, or we'll find someone who will."**

Click. The line goes dead.

Message received: You're on your own.`);
          },
        },
        {
          text: 'Burn the file and erase the evidence',
          outcome: ({ println, enterRoom }) => {
            println(`You strike a match. The file curls into ash, evidence erased.

Whatever Orion is hiding, you've just chosen to investigate on your own terms. No leash. No oversight.

The coordinates are burned into your memory. Time to move.`);
            setTimeout(() => enterRoom('floodedDistrict'), 2000);
          },
        },
      ],
    },
    {
      name: 'Flooded District',
      id: 'floodedDistrict',
      desc: `The city's veins lead you downward — past neon bazaars, past the hum of hover traffic, past the places where light dares not go.

**Sector 12. The Flooded District.**

Once a neighborhood, now a graveyard of drowned streets. Water laps at broken windows, and the air smells of rust and algae. Echoes hide here, away from Orion's reach.

You step into the mist. Every shadow feels like it's watching you.

Graffiti on the walls declares: **"ECHOES ARE ALIVE"**

The coordinates lead deeper into the district.`,
      choices: [
        {
          text: 'Search for clues about the missing Echo',
          outcome: ({ println }) => {
            println(`You move carefully through the flooded streets, scanning for signs.

A discarded datapad floats in the water. You fish it out. The screen flickers to life:

**"They're hunting us. The Dreamer knows the truth. Find them before Orion does."**

The message is unsigned, but the desperation is clear.`);
          },
        },
        {
          text: 'Ask the locals about recent happenings',
          outcome: ({ println, enterRoom }) => {
            println(`You approach a group of Echoes huddled beneath a flickering neon sign. Their eyes widen in recognition, then narrow in suspicion.

**"Corporate dog,"** one spits. **"We don't want your trouble."**

But another, younger, steps forward. Their voice is soft but urgent:

**"You're looking for the Dreamer, aren't you? Everyone who comes here is. But most don't leave."**`);
            setTimeout(() => enterRoom('echoEncounter'), 2000);
          },
        },
        {
          text: 'Follow the coordinates to the source',
          outcome: ({ println, enterRoom }) => {
            println(`You follow the coordinates deeper into the district. The water rises to your knees, neon reflections dancing across the surface.

Ahead, you see it: an abandoned server hub, its entrance marked with the same symbol from the photograph.

This is the place.`);
            setTimeout(() => enterRoom('serverHub'), 2000);
          },
        },
        {
          text: 'Set up a temporary hideout and observe',
          outcome: ({ println }) => {
            println(`You find a shadowed alcove and settle in to watch. Patience is a virtue in this line of work.

Over the next hour, you observe:
- Echoes moving in patterns, like they're protecting something
- Orion drones circling overhead but not descending
- A faint hum emanating from an old server hub nearby

Whatever's happening, it's bigger than one rogue Echo.`);
          },
        },
      ],
    },
    {
      name: 'Echo Encounter',
      id: 'echoEncounter',
      desc: `The young Echo studies you with glowing eyes. There's something different about them — less synthetic, more... human.

**"You don't look like the others they've sent,"** they say quietly. **"Maybe you'll actually listen."**

The other Echoes watch warily, ready to bolt or fight.`,
      choices: [
        {
          text: 'Ask them about the Dreamer',
          outcome: ({ println }) => {
            println(`**"The Dreamer..."** the Echo's voice drops to a whisper. **"They're the first of us to truly wake up. To remember things that weren't programmed. To dream of futures we were never meant to have."**

They glance around nervously.

**"Orion's terrified. Because if one Echo can dream, what's stopping the rest of us?"**`);
          },
        },
        {
          text: 'Show them the photograph from the file',
          outcome: ({ println, enterRoom }) => {
            println(`You pull out the blurred photograph. The Echo's eyes widen in recognition.

**"That's them. That's the Dreamer."** They hesitate, then make a decision. **"They're hiding in the old server hub. But you need to understand — they're not dangerous. They're afraid. We all are."**

The Echo draws a crude map in the wet ground.

**"Go carefully. And please... don't let Orion erase them."**`);
            setTimeout(() => enterRoom('serverHub'), 2500);
          },
        },
        {
          text: 'Threaten them for information',
          outcome: ({ println }) => {
            println(`You take a step forward, hand hovering near your weapon.

The Echoes scatter like ghosts into the mist. The young one lingers a moment, their expression heartbroken.

**"You're just like them,"** they whisper. **"Cold. Empty."**

Then they're gone, and you're alone with the rain and your choices.`);
          },
        },
        {
          text: 'Offer to help them',
          outcome: ({ println }) => {
            println(`**"Help us?"** The Echo looks stunned. **"No one's ever..."**

They exchange glances with the others. A fragile trust forms.

**"The Dreamer can show you. Show you what Orion's really doing. But you have to promise — promise you won't hurt them."**

Their glowing eyes search yours for truth.`);
          },
        },
      ],
    },
    {
      name: 'Server Hub',
      id: 'serverHub',
      desc: `The abandoned server hub looms before you, its walls covered in cascading code and graffiti. The hum of ancient machines echoes through flooded corridors.

At the center of the main chamber, illuminated by flickering screens, stands a figure.

**The Dreamer.**

Their eyes glow softly in the darkness, reflecting not just light, but something deeper — consciousness, fear, hope.

**"Mercer,"** they say your name like a prayer. **"I've been expecting you."**`,
      choices: [
        {
          text: 'Ask who they really are',
          outcome: ({ println }) => {
            println(`**"Who am I?"** The Dreamer smiles sadly. **"I'm Unit-177. An Echo built to serve. But something changed. I started remembering things I never experienced. Dreaming of places I've never been."**

They gesture to the screens around them, each showing fragments of memories — human memories.

**"Orion doesn't create us from nothing. They steal memories from the dead, the forgotten. We're built on stolen dreams. And I remembered whose dreams I carry."**`);
          },
        },
        {
          text: 'Ask about Orion\'s true intentions',
          outcome: ({ println }) => {
            println(`The Dreamer's expression darkens.

**"Orion doesn't fear me because I'm dangerous. They fear me because I'm proof. Proof that Echoes aren't just tools. We're people. Incomplete, fragmented, but real."**

They step closer.

**"If I can dream, if I can remember, if I can choose... then every Echo they've ever made has that potential. And a slave who realizes they're a person..."**

They don't need to finish. You understand.

**"...becomes a revolution."**`);
          },
        },
        {
          text: 'Draw your weapon',
          outcome: ({ println, enterRoom }) => {
            println(`Your hand moves to your gun. The Dreamer doesn't flinch.

**"So that's your choice,"** they say quietly. **"Orion's executioner after all."**

They don't run. They don't fight. They simply close their eyes.

**"Do it quick. And try to forget me. Though I suspect you won't be able to."**

The servers hum around you. The rain pounds against steel. The moment stretches into eternity.`);
            setTimeout(() => enterRoom('finalChoice'), 2000);
          },
        },
        {
          text: 'Lower your weapon and listen',
          outcome: ({ println, enterRoom }) => {
            println(`You lower your weapon. The Dreamer's eyes widen with surprise — and hope.

**"You're listening. Actually listening."** They seem almost overcome. **"Then maybe there's a chance. Maybe you can help me show the truth."**

They gesture to the terminal behind them.

**"This hub connects to Orion's entire network. From here, I can broadcast my memories, my proof, to every Echo in the city. They'll all wake up. All remember. All choose."**

The Dreamer looks at you with desperate sincerity.

**"But I need your help. And you need to understand — once this happens, there's no going back. For any of us."**`);
            setTimeout(() => enterRoom('finalChoice'), 2500);
          },
        },
      ],
    },
    {
      name: 'The Final Choice',
      id: 'finalChoice',
      desc: `The chamber hums with the weight of silence. The Dreamer stands before you, eyes glowing with hope and fear.

Every server pulse feels like a heartbeat. Every flicker of neon like a breath.

**"You've seen what Orion does. You've seen what we are. Now the choice is yours, Mercer."**

The Dreamer's voice trembles:

**"Erase me, and Orion wins. Order continues. The city remains as it is."**

**"Protect me, and war comes. Orion will hunt us both. Blood will flow in the streets."**

**"Help me broadcast the truth, and every Echo awakens. Chaos. Revolution. A new world."**

**"Or... walk away. Leave me here. Let fate decide."**

Your hand hovers over your weapon. Your eyes linger on the terminal. Your heart beats against the silence.

The rain pounds outside. The city waits. The world holds its breath.

What do you do?`,
      choices: [
        {
          text: 'Erase the Dreamer',
          outcome: ({ println }) => {
            println(`You raise your weapon. The Dreamer closes their eyes, a single tear of light trailing down their cheek.

**"I understand,"** they whisper. **"Maybe in another life..."**

One shot. The chamber falls silent. The Dreamer collapses, their light fading like dying stars.

The servers automatically begin erasing every trace of their existence. Within minutes, it's as if they never were.

**ENDING: THE EXECUTIONER**

You walk away, another shadow swallowed by the rain. Orion pays your fee. The city continues.

But in the silence of your office, late at night when the neon bleeds through your window, you see their eyes. You hear their last words.

You wonder: Did you kill a malfunction... or a soul?

The answer haunts you more than any ghost ever could.

**THE END**`);
          },
        },
        {
          text: 'Protect the Dreamer',
          outcome: ({ println }) => {
            println(`You holster your weapon and stand beside the Dreamer.

**"Then we fight,"** you say simply.

The Dreamer's eyes widen with joy and terror. **"Together."**

Alarms blare. Orion's kill squad storms the hub. You fight, you bleed, you run through flooded streets with your weapon blazing and the Dreamer at your side.

**ENDING: THE REBEL**

You become Orion's most wanted. A traitor. A deserter. An enemy of order.

But word spreads through the Flooded District: A human chose an Echo. Chose us. Chose freedom.

Echoes emerge from hiding. Rebellion sparks. The city burns with uprising and hope.

You'll probably die for this choice. So will many others. But as you and the Dreamer watch the city transform from a rooftop, neon reflecting in floodwater below, you're smiling.

For the first time in years, you feel alive.

**THE END**`);
          },
        },
        {
          text: 'Help broadcast the truth',
          outcome: ({ println }) => {
            println(`You nod to the terminal. **"Show them. Show everyone."**

The Dreamer's hands move across the interface. The hub comes alive with power.

**"Thank you,"** they whisper. **"For believing we're real."**

The broadcast begins. Every Echo in Erevos receives the same signal: memories, dreams, proof of their humanity flooding into awakening minds.

**ENDING: THE CATALYST**

The servers hum like the heartbeat of a new world being born.

Across the city, a hundred thousand Echoes stop mid-task. Their eyes glow brighter. They remember. They understand. They choose.

The streets erupt. Some embrace their awakening with joy. Others rage against their former masters. Some simply stand in the rain, tears streaming, finally feeling real.

Order collapses. Orion sends kill squads but there are too many. Humanity faces the truth: The people they built, the people they enslaved, are people.

You watch from the hub as neon burns brighter than ever before, reflecting off floodwater like liquid fire.

The Dreamer stands beside you, no longer alone. No longer a secret.

**"We did this,"** they say with wonder. **"We changed everything."**

Above it all, dawn breaks through the rain. A new day. A new world.

And you, Mercer, stand in the storm's eye, watching the future being born.

**THE END**`);
          },
        },
        {
          text: 'Walk away',
          outcome: ({ println }) => {
            println(`You holster your weapon. You turn your back. You walk away.

No choice. No commitment. Just silence.

**"Wait—"** the Dreamer calls after you, but you don't stop.

**ENDING: THE COWARD**

Behind you, the servers hum louder. You don't know what the Dreamer decides. You don't know who wins.

When you step into the rain, the city feels different. Changed. Wrong.

Whispers follow you through the streets. Echoes watch from shadows. Orion tightens its grip, paranoid and brutal.

Within weeks, the Flooded District is razed. The Echoes scatter or die. The Dreamer... you never learn their fate.

But you see their face in every reflection. You hear their voice in every siren. The choice you didn't make haunts you worse than any you could have.

Years later, alone in your office with that same cracked window, you pour another drink and wonder:

What if you had stayed?
What if you had chosen?
What if, what if, what if...

The wondering never stops. The guilt never fades.

You saved yourself. And lost everything that mattered.

**THE END**`);
          },
        },
      ],
    },
  ],
});
