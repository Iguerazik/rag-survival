'use strict';

// Labyrinth Forest (prt_maze03): 5x5 closed rooms. As in the original, each room has a warp on
// every side that sends you to a random room of the maze.
const MazeWarps = (() => {
  function roomAt(field, x, y) {
    if (!field?.rooms) return -1;
    const col = Math.floor((x + field.w * field.cell / 2) / field.cell);
    const row = Math.floor((y + field.h * field.cell / 2) / field.cell);
    const room = field.rooms.find(r => col >= r.x0 && col <= r.x1 && row >= r.y0 && row <= r.y1);
    return room ? room.index : -1;
  }
  // Random destination when playing solo; a fixed one in co-op so the party can follow each other.
  function destination(field, warp, fixed) {
    const count = field.rooms.length;
    let room;
    if (fixed) {
      room = (warp.room * 7 + warp.side * 3 + 5) % count;
      if (room === warp.room) room = (room + 1) % count;
    } else {
      room = Math.floor(Math.random() * (count - 1));
      if (room >= warp.room) room++;
    }
    const exits = field.warps.filter(item => item.room === room);
    const exit = fixed ? exits[(warp.side + 2) % exits.length] : exits[Math.floor(Math.random() * exits.length)];
    const target = field.rooms[room].center;
    const gap = Math.hypot(target.x - exit.x, target.y - exit.y) || 1;
    return { room, x: exit.x + (target.x - exit.x) * 110 / gap, y: exit.y + (target.y - exit.y) * 110 / gap, fallback: target };
  }
  return { roomAt, destination };
})();
