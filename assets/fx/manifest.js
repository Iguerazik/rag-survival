'use strict';
// Custom original, hand-coded pixel animation sheets, inspired by classic 2D MMORPG visual effects.
const fxSheets = {
  "bash": {
    "file": "classic/bash.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.07,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "pierce": {
    "file": "classic/pierce.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "bowling": {
    "file": "bowling.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "sonicblow": {
    "file": "classic/sonicblow.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "rolling": {
    "file": "rolling.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "axetornado": {
    "file": "classic/axetornado.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "grimtooth": {
    "file": "grimtooth.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "counterslash": {
    "file": "counterslash.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "souldestroyer": {
    "file": "classic/souldestroyer.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "napalm": {
    "file": "classic/napalm.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "spirit": {
    "file": "classic/spirit.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "ripper": {
    "file": "ripper.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "fire": {
    "file": "classic/fire.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.07,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "magnum": {
    "file": "magnum.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "ignition": {
    "file": "ignition.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "crimson": {
    "file": "classic/crimson.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "comet": {
    "file": "classic/comet.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "cartterm": {
    "file": "cartterm.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "frost": {
    "file": "classic/frost.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.07,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "stormgust": {
    "file": "classic/stormgust.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "storm": {
    "file": "storm.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "lightning": {
    "file": "classic/lightning.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "vermilion": {
    "file": "classic/vermilion.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "armcannon": {
    "file": "armcannon.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "arrows": {
    "file": "classic/arrows.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.07,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "shower": {
    "file": "classic/shower.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "arrowstorm": {
    "file": "classic/arrowstorm.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "aimed": {
    "file": "aimed.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "precise": {
    "file": "precise.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "wargstrike": {
    "file": "wargstrike.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "heal": {
    "file": "classic/heal.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.07,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "blessing": {
    "file": "classic/blessing.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "holy": {
    "file": "holy.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "judex": {
    "file": "classic/judex.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "adoramus": {
    "file": "adoramus.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "magnus": {
    "file": "classic/magnus.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "sanctuary": {
    "file": "classic/sanctuary.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "assumptio": {
    "file": "assumptio.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "praefatio": {
    "file": "praefatio.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "hammerfall": {
    "file": "classic/hammerfall.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "source-over"
  },
  "mammon": {
    "file": "mammon.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "axeboom": {
    "file": "axeboom.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "cartrev": {
    "file": "cartrev.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  },
  "agiup": {
    "file": "classic/agiup.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.23,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "caster",
    "blend": "source-over"
  },
  "endure": {
    "file": "endure.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "caster",
    "blend": "lighter"
  },
  "overthrust": {
    "file": "overthrust.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "caster",
    "blend": "lighter"
  },
  "concentration": {
    "file": "concentration.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.42,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "caster",
    "blend": "lighter"
  },
  "charge": {
    "file": "charge.png",
    "frames": 8,
    "w": 96,
    "h": 96,
    "fps": 16,
    "scale": 1.15,
    "anchor": [
      0.5,
      0.65
    ],
    "at": "target",
    "blend": "lighter"
  }
};
