// Recording
let recorder = undefined;

const handleSuccess = function (stream) {
    const options = { mimeType: "audio/webm" };
    const recordedChunks = [];
    const mediaRecorder = new MediaRecorder(stream, options);
    recorder = mediaRecorder;

    mediaRecorder.addEventListener("dataavailable", function (e) {
        if (e.data.size > 0) recordedChunks.push(e.data);
    });

    mediaRecorder.addEventListener("stop", async function () {
        const f = new File([new Blob(recordedChunks)], "audio.webm");
        MidiUtils.loadFromWAV(f, "webm");
    });

    mediaRecorder.start();
};

let isRecording = false;

function startRecording() {
    console.log("recording...");

    navigator.mediaDevices
        .getUserMedia({ audio: true, video: false })
        .then(handleSuccess)
        .then(() => {
            isRecording = true;
        })
        .catch((err) => {
            console.error(err);
        });
}

function stopRecording() {
    console.log("stopping recording...");
    
    if (!recorder || recorder.state === "inactive") return;
    isRecording = false;

    recorder.stop();
    recorder.stream.getAudioTracks().forEach((t) => t.stop());
    recorder = undefined;
}

// Pitch range from 0-127, inclusive.
const minPitch = 21;
const maxPitch = 108;

// The last played key number
let last_mouse_key_number = -1;

// Map the key with the key number
let key_mapping = {
    // White keys of the first octave
    z: 0,
    x: 2,
    c: 4,
    v: 5,
    b: 7,
    n: 9,
    m: 11,
    // Black keys of the first octave
    s: 1,
    d: 3,
    g: 6,
    h: 8,
    j: 10,
    // White keys of the second octave
    w: 12,
    e: 14,
    r: 16,
    t: 17,
    y: 19,
    u: 21,
    i: 23,
    // Black keys of the second octave
    3: 13,
    4: 15,
    6: 18,
    7: 20,
    8: 22,
};

// Signal the key is down
let key_down_status = new Array(23);

function getBasePitch() {
    return parseInt($("#pitch").val());
}

function getAmplitude() {
    return parseInt($("#amplitude").val());
}

function getPlayMode() {
    return $(":radio[name=play-mode]:checked").val();
}

function handleNoteOn(key_number) {
    // Find the pitch
    let pitch = getBasePitch() + key_number;

    // Extract the amplitude value from the slider
    let amplitude = getAmplitude();

    const on = (pitch) => {
        if (pitch <= maxPitch) MIDI.noteOn(0, pitch, amplitude);
    };

    // Use the two numbers to start a MIDI note
    on(pitch);

    // Handle chord modes
    const mode = getPlayMode();
    if (mode === "major") {
        on(pitch + 4);
        on(pitch + 7);
    } else if (mode === "minor") {
        on(pitch + 3);
        on(pitch + 7);
    }
}

function handleNoteOff(key_number) {
    // Find the pitch
    let pitch = getBasePitch() + key_number;

    const off = (pitch) => {
        if (pitch <= maxPitch) MIDI.noteOff(0, pitch);
    };

    // Send the note off message for the pitch
    off(pitch);

    // Handle chord modes
    const mode = getPlayMode();
    if (mode === "major") {
        off(pitch + 4);
        off(pitch + 7);
    } else if (mode === "minor") {
        off(pitch + 3);
        off(pitch + 7);
    }
}

function handlePianoMouseDown(evt) {
    return; // TODO: temporarily disable this function

    // Determine which piano key has been clicked on
    // evt.target tells us which item triggered this function
    // The piano key number is extracted from the key id (0-23)
    let key_number = $(evt.target).attr("id").substring(4);
    key_number = parseInt(key_number);

    // Start the note
    handleNoteOn(key_number);

    // Select the key
    $("#key-" + key_number).focus();

    // Show a simple message in the console
    console.log("Piano mouse down event for key " + key_number + "!");

    // Remember the key number
    last_mouse_key_number = key_number;
}

function handlePianoMouseUp(evt) {
    // last_key_number is used because evt.target does not necessarily
    // equal to the key that has been clicked on
    if (last_mouse_key_number < 0) return;

    // Stop the note
    handleNoteOff(last_mouse_key_number);

    // De-select the key
    $("#key-" + last_mouse_key_number).blur();

    // Show a simple message in the console
    console.log("Piano mouse up event for key " + last_mouse_key_number + "!");

    // Reset the key number
    last_mouse_key_number = -1;
}

function handlePageKeyDown(evt) {
    // Exit the function if the key is not a piano key
    // evt.key tells us the key that has been pressed
    if (!(evt.key in key_mapping)) return;

    // Find the key number of the key that has been pressed
    let key_number = key_mapping[evt.key];
    if (key_down_status[key_number]) return;

    // Start the note
    handleNoteOn(key_number);

    // Select the key
    $("#key-" + key_number).focus();

    // Show a simple message in the console
    console.log("Page key down event for key " + key_number + "!");

    // Remember the key is down
    key_down_status[key_number] = true;
}

function handlePageKeyUp(evt) {
    // Exit the function if the key is not a piano key
    // evt.key tells us the key that has been released
    if (!(evt.key in key_mapping)) return;

    // Find the key number of the key that has been released
    let key_number = key_mapping[evt.key];

    // Stop the note
    handleNoteOff(key_number);

    // De-select the key
    $("#key-" + key_number).blur();

    // Show a simple message in the console
    console.log("Page key up event for key " + key_number + "!");

    // Reset the key status
    key_down_status[key_number] = false;
}

class Mixer {
    static mutes = Array(DOM.roll.numChannels).fill(false);
    static solos = Array(DOM.roll.numChannels).fill(false);
    static visibles = Array(DOM.roll.numChannels).fill(false);

    static anySolos() {
        return this.solos.reduce((acc, x) => acc || x, false);
    }

    static shouldPlay(ch) {
        // Returns whether a channel should play or not.
        if (this.mutes[ch])
            // Muted.
            return false;
        if (this.anySolos() && !this.solos[ch])
            // Has solos, but channel not soloed.
            return false;
        return true;
    }
}

$(document).ready(function () {
    MIDI.loadPlugin({
        soundfontUrl: "./assets/third-party/midi-js/soundfont/",
        instruments: [
            "trumpet",
            /*
             * You can preload the instruments here if you add the instrument
             * name in the list here
             */
        ],
        onprogress: function (state, progress) {
            console.log(state, progress);
        },
        onsuccess: function () {
            // Resuming the AudioContext when there is user interaction
            $("body").click(function () {
                if (MIDI.getContext().state != "running") {
                    MIDI.getContext()
                        .resume()
                        .then(function () {
                            console.log("Audio Context is resumed!");
                        });
                }
            });

            // Hide the loading text and show the container
            $(".loading").hide();
            $(".container").show();

            // At this point the MIDI system is ready
            MIDI.setVolume(0, 127); // Set the volume level
            MIDI.programChange(0, 56); // Use the General MIDI 'trumpet' number

            // Set up the event handlers for all the buttons
            $("button").on("mousedown", handlePianoMouseDown);
            $(document).on("mouseup", handlePianoMouseUp);

            // Set up key events
            $(document).keydown(handlePageKeyDown);
            $(document).keyup(handlePageKeyUp);

            for (let c = 0; c < DOM.roll.numChannels; c++) {
                $(`#instrument-select-${c + 1}`).on("change", (e) => {
                    console.log(
                        `Changed instrument on channel ${c} to ${e.target.value}!`
                    );
                    MIDI.programChange(c, Instrument.getNumber(e.target.value));
                });
            }
        },
    });

    function getChannelID(html) {
        return html.id.split("-").pop() - 1;
    }

    $(".instrument-select").on("change", function (e) {
        const c = getChannelID(e.target);
        console.log(`changing instrument ${c} instrument: ${e.target.value}`);
        MIDI.programChange(c, DOM.roll.ch(c).instrumentNum);
    });

    $(".instrument-volume").on("change", function (e) {
        const c = getChannelID(e.target);
        console.log(`changing instrument ${c} volume: ${e.target.value}`);
        MIDI.setVolume(c, DOM.roll.ch(c).volume);
    });

    // $(".instrument-show").on("change", function (e) {
    //     const c = getChannelID(e.target);
    //     console.log(`toggling instrument ${c} visibility: ${e.target.checked}`);
    //     Mixer.visibles[c] = e.target.checked;
    // });

    $(".instrument-mute").on("change", function (e) {
        const c = getChannelID(e.target);
        console.log(`toggling instrument ${c} mute: ${e.target.checked}`);
        Mixer.mutes[c] = e.target.checked;

        MIDI.setVolume(c, Mixer.shouldPlay(c) ? 0 : DOM.roll.ch(c).volume);
    });

    $(".instrument-solo").on("change", function (e) {
        const c = getChannelID(e.target);
        console.log(`toggling instrument ${c} solo: ${e.target.checked}`);
        Mixer.solos[c] = e.target.checked;

        MIDI.setVolume(c, Mixer.shouldPlay(c) ? 0 : DOM.roll.ch(c).volume);
    });

    function updateRollWidth() {
        const colWidth = Math.max(
            ($(document).width() * 7) / 12,
            $(".main-container").width()
        );
        const w = colWidth - DOM.roll.yruler - DOM.roll.kbwidth;
        console.log("resizing to width", w);
        DOM.roll.width = w;
    }

    $(window).resize(updateRollWidth);
    updateRollWidth();

    DOM.roll.onNoteClicked = function (note) {
        const { t, n, g, v, ch } = note;
        $("#pitch-control").val(n);
        $("#duration-control").val(g);
        $("#velocity-control").val(v);
    };

    $("#pitch-control").on("change", () => {
        DOM.roll.updateSelectedAttribute(
            "n",
            Number($("#pitch-control").val())
        );
    });

    $("#duration-control").on("change", () => {
        DOM.roll.updateSelectedAttribute(
            "g",
            Number($("#duration-control").val())
        );
    });

    $("#velocity-control").on("change", () => {
        DOM.roll.updateSelectedAttribute(
            "v",
            Number($("#velocity-control").val())
        );
    });

    $("#channel-control").on("change", () => {
        DOM.roll.updateSelectedAttribute(
            "ch",
            Number($("#channel-control").val())
        );
    });

    // Trigger updates as if called.
    $("#timebase-control")[0].dispatchEvent(new Event("input"));

    $("#tempo-control").on("change", (e) => {
        const tempo = Number(e.target.value);
        console.log(`changing tempo to ${tempo} bpm`);
        DOM.roll.tempo = tempo;
    });

    // Initialise settings.
    $("#tempo-control").val(DOM.roll.tempo);
    $("#timesig-control-menu a").on("click", (e) => {
        const sig = e.target.innerHTML;
        console.log(`changing time sig to ${sig}`);

        function getGridDivs(sig) {
            // [subdivs per measure, subdivs per beat]
            switch (sig) {
                case "2/4":
                    return [8, 4];
                case "3/4":
                    return [12, 4];
                default:
                case "4/4":
                    return [16, 4];
                case "5/4":
                    return [20, 4];
                case "6/4":
                    return [24, 4];
                case "7/4":
                    return [28, 4];
                case "3/8":
                    return [12, 4];
                case "6/8":
                    return [24, 4];
                case "9/8":
                    return [48, 4];
                case "12/8":
                    return [60, 4];
            }
        }

        const [timebase, grid] = getGridDivs(sig);
        DOM.roll.timebase = timebase;
        DOM.roll.grid = grid;
        DOM.roll.redraw();
    });

    // Enable Bootstrap Toggle
    // $("input[type=checkbox]").bootstrapToggle();

    // Dropdown updates button display.
    $(".dropdown-item").on("click", function () {
        if ($(this).hasClass("active")) return;
        var btnObj = $(this).parent().siblings("button");
        $(btnObj).text($(this).text());
        $(btnObj).val($(this).text());
        $(this).siblings().removeClass("active");
        $(this).addClass("active");
    });

    // Set up the event handlers
    // $('a.nav-link').on("click", showTab); // Tab clicked
    // $('a.dropdown-item').on("click", changeTabs); // Tab item clicked

    // Populate instrument-select options with the preset of instruments.
    const options = Instrument.getNames()
        .map((inst) => `<option value="${inst}">${inst}</option>`)
        .join("");
    const selectBoxes = document.querySelectorAll(".instrument-select");
    selectBoxes.forEach((e) => $(options).appendTo(e));

    $("#upload-file-select").on("change", function (e) {
        const input = e.target;
        $("#upload-button").prop("disabled", true);
        if (input.files.length === 0) {
            alert("No files were selected!");
        } else if (input.files[0]) {
            MidiUtils.loadFromFile(input.files[0]);
        }
        $("#upload-button").prop("disabled", false);
    });

    $("#save-button").on("click", function () {
        MidiUtils.exportToMidi();
    });

    $("#record-button").on("click", function () {
        if (!isRecording) {
            startRecording();
            $("#record-button-text")[0].innerHTML = "Stop";
        } else {
            stopRecording();
            $("#record-button-text")[0].innerHTML = "Record";
        }
    });

    function setInstruments() {
        for (let c = 0; c < DOM.roll.numChannels; c++) {
            MIDI.setVolume(c, DOM.roll.ch(c).volume);
            MIDI.programChange(c, DOM.roll.ch(c).instrumentNum);
        }
    }

    $("#play-button").on("click", function () {
        setInstruments();

        const ctx = MIDI.getContext();
        DOM.roll.play(
            ctx,
            function (note) {
                // t:noteOnTime, g:noteOffTime, n:noteNumber
                const { t, g, n, v, ch } = note;
                console.log("Playing note:", JSON.stringify(note));

                if (!Mixer.shouldPlay(ch)) {
                    console.log("Channel excluded by mixer.");
                    return;
                }

                MIDI.noteOn(ch, n, v);
                MIDI.noteOff(ch, n, g - t);
            },
            0
        );
    });

    $("#stop-button").on("click", function () {
        DOM.roll.stop();
        MIDI.stopAllNotes();
    });
});
