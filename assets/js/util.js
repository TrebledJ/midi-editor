class DOM {
    static roll = $("webaudio-pianoroll")[0];

    // Sets the instrument of the track number to the MIDI instrumentNum (0-127).
    static setTrackInstrument(trackNum, instrumentNum) {
        const sel = $(`#instrument-select-${trackNum}`)[0];
        sel.value = Instrument.getNameByNumber(instrumentNum);
        if (sel.value === "") {
            // Option doesn't exist; set to default instead.
            sel.value = Instrument.default;
        }
    }

    // Return the instrument number.
    static getTrackInstrument(trackNum) {
        return Instrument.getNumber(
            $(`#instrument-select-${trackNum}`)[0].value
        );
    }

    // Download a URI to a target filename.
    static downloadURI(uri, filename) {
        var a = document.createElement("a");
        a.style.display = "none";
        a.href = uri;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
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
        return new Map(this.instruments).get(name);
    }
}

class MidiUtils {
    static bpm = 120;
    static midi = {};

    static loadFromFile(file) {
        if (!["wav", "mid"].includes(file.name.split(".").pop())) {
            throw new Error(`Unrecognised file type in '${file}'.`);
        }

        if (file.name.endsWith(".wav")) {
            // Pass the file on.
            this.loadFromWAV(file);
        } else if (file.name.endsWith(".mid")) {
            // Read MIDI from file.
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    this.loadFromMIDI(e.target.result);
                } catch (err) {
                    console.error(err);
                    alert("Failed to load the file. :(");
                }
            };
            reader.readAsArrayBuffer(file);
        }
    }

    static loadFromMIDI(data) {
        // Parse into object: https://github.com/Tonejs/Midi/tree/master#format.
        const midi = new Midi(data);
        console.log(midi);

        let seq = DOM.roll.sequence;
        seq.splice(0, seq.length); // Delete contents.

        const addNote = (note, vel, tick, dur, channel) => {
            seq.push({ n: note, t: tick, g: dur, v: vel, ch: channel, f: 0 });
        };

        if (midi.header.tempos.length > 0) {
            // Update BPM.
            this.bpm = midi.header.tempos[0].bpm;
        }

        midi.tracks.forEach((track) => {
            const { name, channel, notes, instrument } = track;

            // Add notes to DOM.
            notes.forEach(({ midi, velocity, ticks, durationTicks }) => {
                addNote(
                    midi,
                    velocity,
                    Math.round(ticks / this.bpm),
                    Math.round(durationTicks / this.bpm),
                    channel
                );
            });

            DOM.setTrackInstrument(channel + 1, instrument.number);

            const endTicks = track.endOfTrackTicks;
        });

        // TODO: preserve CC information some way or another

        DOM.roll.sortSequence();
        DOM.roll.redraw();
    }

    static loadFromWAV(file) {
        // console.log("loadFromWAV is unimplemented.");
        // TODO.

        var form = new FormData();
        form.append("file", file, "audio.wav");
        this.transformAudioPayload(form);
    }

    static loadMidiFromResponse(midi) {
        const byteArray = Uint8Array.from(
            Array.from(midi).map((c) => c.charCodeAt(0))
        );
        const blob = new Blob([byteArray], { type: "audio/mid" });

        var reader = new FileReader();
        reader.onload = function (e) {
            try {
                MidiUtils.loadFromMIDI(e.target.result);
            } catch (err) {
                console.error(err);
                alert("Failed to load the file. :(");
            }
        };
        reader.readAsArrayBuffer(blob);
    }

    static transformAudioPayload(payload) {
        $.ajax({
            url: "/transform",
            type: "POST",
            data: payload,
            processData: false,
            contentType: false,
            success: function (response) {
                const midi = atob(response.midi);
                console.log(`midi: ${midi.length}B`);
                console.log("checksum:", response.checksum);
                MidiUtils.loadMidiFromResponse(midi);
            },
            error: function (error) {
                console.error(error);
            },
        });
    }

    static exportToMidi() {
        let midi = new Midi();
        midi.header.setTempo(this.bpm);

        for (let i = 0; i < PianoRoll.numChannels; i++) {
            const track = midi.addTrack();

            const notes = PianoRoll.getChannelNotes(i);
            if (notes.length === 0) continue; // Skip empty tracks.

            console.log("making track", i);

            track.instrument.number = PianoRoll.getChannelInstrumentNumber(i);
            track.channel = i;

            notes.forEach((note) => {
                console.log("adding note:", JSON.stringify(note));
                track.addNote({
                    midi: note.n,
                    velocity: note.v,
                    ticks: note.t * this.bpm,
                    durationTicks: note.g * this.bpm,
                });

                // .addNote({
                //     name: "C5",
                //     time: 0.3,
                //     duration: 0.1,
                // });

                // .addCC({
                //     number: 64,
                //     value: 127,
                //     time: 0.2,
                // });
            });
        }

        console.log("final midi object:");
        console.log(JSON.stringify(midi));

        const buf = midi.toArray();
        const blob = new Blob([buf], {
            type: "audio/mid",
        });

        const url = window.URL.createObjectURL(blob);
        DOM.downloadURI(url, "export.mid");
        window.URL.revokeObjectURL(url);
    }
}

class PianoRoll {
    // Channels here are 0-indexed.

    // Get an array of notes from channel c.
    static getChannelNotes(c) {
        return DOM.roll.sequence.filter((note) => note.ch == c);
    }

    static getChannelInstrumentNumber(c) {
        return DOM.getTrackInstrument(c + 1);
    }

    static hideChannelNotes(c) {
        // TODO
    }

    static showChannelNotes(c) {
        // TODO
    }

    static get numChannels() {
        // TODO: expand? dynamic?
        return 5;
    }
}

// $(function () {

// });
