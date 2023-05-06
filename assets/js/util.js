const roll = $("webaudio-pianoroll")[0];

class MidiUtils {
  static loadFromFile(file) {
    console.log("got file:", file.name);
    if (!["wav", "mid"].includes(file.name.split(".").pop())) {
      throw new Error(`Unrecognised file type in '${file}'.`);
    }

    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        if (file.name.endsWith(".wav")) {
          // TODO: check
          MidiUtils.loadFromWAV(e.target.result);
        } else if (file.name.endsWith(".mid")) {
          MidiUtils.loadFromMIDI(e.target.result);
        }
      } catch (err) {
        console.error(err);
        alert("Failed to load the file. :(");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  static loadFromMIDI(data) {
    // Parse into object: https://github.com/Tonejs/Midi/tree/master#format.
    const midi = new Midi(data);
    // console.log(JSON.stringify(midi));

    let seq = roll.sequence;
    seq.splice(0, seq.length); // Delete contents.

    const addNote = (note, vel, tick, dur) => {
      seq.push({ n: note, t: tick, g: dur, v: vel, f: 0 });
    };

    const bpm = midi.header.tempos[0].bpm;

    midi.tracks.forEach((track) => {
      const { name, channel, notes } = track;

      notes.forEach(({ midi, velocity, ticks, durationTicks }) => {
        addNote(midi, velocity, Math.round(ticks / bpm), Math.round(durationTicks / bpm));
      });
      const endTicks = track.endOfTrackTicks;
    });

    roll.redraw();
  }

  static loadFromWAV(wav) {
    console.log("loadFromWAV is unimplemented.");
    // TODO.
  }
}

// $(function () {

// });
