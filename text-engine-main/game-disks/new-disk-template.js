// This simple game disk can be used as a starting point to create a new adventure.
// Change anything you want, add new rooms, etc.
const newDiskTemplate = () => ({
  roomId: 'start', // Set this to the ID of the room you want the player to start in.
  rooms: [
    {
      id: 'start', // Unique identifier for this room. Entering a room will set the disk's roomId to this.
      name: 'Neon Alley Entrance', // Displayed each time the player enters the room.
      desc: `You're standing at the mouth of a rain-slick neon alley. A sealed HATCH glows with fused cables. Type ITEMS to see a list of objects.`, // Displayed when the player first enters the room.
      items: [
        {
          name: 'hatch',
          desc: 'A maintenance hatch leading down into the vault.', // Displayed when the player looks at the item.
          onUse: () => println(`Type GO NORTH or USE LASER to try to open the hatch.`), // Called when the player uses the item.
        },
        {
          name: ['cables', 'wire'], // The player can refer to this item by either name. The game will use the first name.
          desc: `A tangle of neon cables fused across the hatch. They'll need to be cut to open it.`,
        },
        {
          name: 'laser cutter',
          desc: `A handheld plasma cutter. USE it to slice through fused cables.`,
          isTakeable: true, // Allows the player to take the item.
          onUse() {
            // Remove the block on the room's only exit.
            const room = getRoom('start');
            const exit = getExit('north', room.exits);

            if (exit.block) {
              delete exit.block;
              println(`The laser cutter sings as it severs the neon cables. The hatch is now unblocked.`);

              // Update the cutter's description.
              getItem('laser cutter').desc = `A scorched laser cutter. You've already used it to free the hatch.`;
            } else {
              println(`There's nothing to use the laser cutter on here.`);
            }
          },
        }
      ],
      exits: [
        {
          dir: 'north', // "dir" can be anything. If it's north, the player will type "go north" to get to the room called "A Forest Clearing".
          id: 'clearing',
          block: `The HATCH to the NORTH is sealed by fused neon cables.`, // If an exit has a block, the player will not be able to go that direction until the block is removed.
        },
      ],
    },
    {
      id: 'clearing',
      name: 'Maintenance Tunnel',
      desc: `A dimly lit service tunnel. The hum of cooling systems fills the air. To the SOUTH is the Neon Alley Entrance.`,
      exits: [
        {
          dir: 'south',
          id: 'start',
        },
      ],
    }
  ],
});
