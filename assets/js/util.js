class Channel {
    constructor(id) {
        this.id = id;
    }

    get instrument() {
        return $(`#instrument-select-${this.id}`)[0];
    }

    get instrumentNum() {
        return Instrument.getNumber(
            $(`#instrument-select-${this.id}`)[0].value
        );
    }

    set instrument(val) {
        if (typeof val === "number") {
            val = Instrument.getNameByNumber(val);
            if (val === "") {
                // Option doesn't exist; set to default instead.
                val = Instrument.default;
            }
        }
        $(`#instrument-select-${this.id}`)[0].value = val;
    }

    get volume() {
        return Math.round($(`#instrument-volume-${this.id}`)[0].value * 127);
    }

    set volume(val) {
        $(`#instrument-volume-${this.id}`)[0].value = val / 127;
    }

    get visible() {
        // return $(`#instrument-show-${this.id}`)[0].value;
        return true;
    }

    set visible(val) {
        // $(`#instrument-show-${this.id}`)[0].value = val;
    }

    get mute() {
        return $(`#instrument-mute-${this.id}`)[0].value;
    }

    set mute(val) {
        $(`#instrument-mute-${this.id}`)[0].value = val;
    }

    get solo() {
        return $(`#instrument-solo-${this.id}`)[0].value;
    }

    set solo(val) {
        $(`#instrument-solo-${this.id}`)[0].value = val;
    }
}

class DOM {
    static roll = $("webaudio-pianoroll")[0];

    static get selectedChannel() {
        return 0; // TODO: be able to dynamically select channel
    }

    static {
        // Monkeypatch roll.

        // TODO: expand channels? dynamic?
        this.roll.numChannels = 5;

        this.roll.ch = function (id) {
            return new Channel(id + 1);
        };

        this.roll.getChannelNotes = function (c) {
            // Filtering is based on 0-indexed.
            return this.sequence.filter((note) => note.ch === c);
        };

        this.roll.selectedChannel = 0;
        this.roll.defaultVelocity = 127;
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

    static selectFile(accepted) {
        var input = document.createElement("input");
        input.type = "file";
        input.accept = accepted.join(',');
        input.style.display = "none";
        document.body.appendChild(input);
        input.click();
        return input;
    }
}

class Instrument {
    static default = "Grand Piano";
    static instruments = [
        ["Grand Piano", 0],
        ["Electric Piano", 5],
        ["Trumpet", 56],
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
            MidiUtils.loadFromWAV(file);
        } else if (file.name.endsWith(".mid")) {
            // Read MIDI from file.
            var reader = new FileReader();
            reader.onload = function (e) {
                try {
                    MidiUtils.loadFromMIDI(e.target.result);
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
            $('#tempo-control').val(this.bpm);
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

            console.log(`read channel ${channel} instrument: ${instrument.number}`);
            DOM.roll.ch(channel).instrument = instrument.number;

            const endTicks = track.endOfTrackTicks;
        });

        // TODO: preserve CC information some way or another

        DOM.roll.sortSequence();
        DOM.roll.redraw();
    }

    static loadFromWAV(blobOrFile, type) {
        type ||= 'wav';
        var form = new FormData();
        form.append("file", blobOrFile, `audio.${type}`);
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

        for (let i = 0; i < DOM.roll.numChannels; i++) {
            const track = midi.addTrack();

            const notes = DOM.roll.getChannelNotes(i);
            if (notes.length === 0) continue; // Skip empty tracks.

            console.log("making track", i);

            track.instrument.number = DOM.roll.ch(i).instrumentNum;
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
