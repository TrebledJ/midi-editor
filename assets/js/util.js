


const roll = $('webaudio-pianoroll')[0];


class MidiUtils {
    static loadFromFile(file) {
        console.log('got file:', file.name);
        if (!['wav', 'mid'].includes(file.name.split('.').pop())) {
            throw new Error(`Unrecognised file type in '${file}'.`);
        }

        var reader = new FileReader();
        reader.onload = function(e) {
            try {
                if (file.name.endsWith('.wav')) {
                    // TODO: check
                    MidiUtils.loadFromWAV(e.target.result);
                } else if (file.name.endsWith('.mid')) {
                    MidiUtils.loadFromMIDI(e.target.result);
                }
            } catch (err) {
                console.error(err);
                alert("Failed to load the file. :(");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    static loadFromMIDI(data) {
        const midi = new Midi(data);
        console.log(JSON.stringify(midi));
    }

    static loadFromWAV(wav) {
        console.log("loadFromWAV is unimplemented.");
        // TODO.
    }
};

// $(function () {

    

// });