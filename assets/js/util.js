class DOM {
    static roll = $("webaudio-pianoroll")[0];

    /**
     * @brief   Sets the instrument of the track number to the MIDI instrumentNum (0-127).
     */
    static setTrackInstrument(trackNum, instrumentNum) {
        const sel = $(`#instrument-select-${trackNum}`)[0];
        sel.value = Instrument.getNameByNumber(instrumentNum);
        if (sel.value === "") {
            // Option doesn't exist; set to default instead.
            sel.value = Instrument.default;
        }
    }
}

class Instrument {
    static default = "Grand Piano";
    static instruments = [
        ["Trumpet", 56],
        ["Grand Piano", 0],
        ["Electric Piano", 5],
        ["Organ", 19],
        ["Acoustic Guitar", 24],
        ["Electric Guitar", 26],
        ["Violin", 40],
        ["Cello", 42],
        ["Saxophone", 65],
        ["Flute", 73],
        ["Clarinet", 71],
        ["Bassoon", 70],
        ["Voice", 91],
    ];

    static getNameByNumber(n) {
        return this.instruments.find(([_, num]) => num == n)[0];
    }

    static getNames() {
        return this.instruments.map((x) => x[0]);
    }

    static getIndexWhere(pred) {
        return this.instruments.findIndex(pred);
    }

    static getNumber(name) {
        return new Map(this.instruments)[name];
    }
}

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
        console.log(JSON.stringify(midi));

        let seq = DOM.roll.sequence;
        seq.splice(0, seq.length); // Delete contents.

        const addNote = (note, vel, tick, dur, channel) => {
            seq.push({ n: note, t: tick, g: dur, v: vel, ch: channel, f: 0 });
        };

        const bpm = midi.header.tempos[0].bpm;

        midi.tracks.forEach((track) => {
            const { name, channel, notes, instrument } = track;

            // Add notes to DOM.
            notes.forEach(({ midi, velocity, ticks, durationTicks }) => {
                addNote(
                    midi,
                    velocity,
                    Math.round(ticks / bpm),
                    Math.round(durationTicks / bpm),
                    channel
                );
            });

            DOM.setTrackInstrument(channel + 1, instrument.number);

            const endTicks = track.endOfTrackTicks;
        });

        DOM.roll.sortSequence();
        DOM.roll.redraw();
    }

    static loadFromWAV(wav) {
        console.log("loadFromWAV is unimplemented.");
        // TODO.
    }
}

// $(function () {

// });
