// Pitch range from 0-127, inclusive.
const minPitch = 21;
const maxPitch = 108;

// The last played key number
let last_mouse_key_number = -1;

// Map the key with the key number
let key_mapping = {
    // White keys of the first octave
    "z": 0, "x": 2, "c": 4, "v": 5, "b": 7, "n": 9, "m": 11,
    // Black keys of the first octave
    "s": 1, "d": 3, "g": 6, "h": 8, "j": 10,
    // White keys of the second octave
    "w": 12, "e": 14, "r": 16, "t": 17, "y": 19, "u": 21, "i": 23,
    // Black keys of the second octave
    "3": 13, "4": 15, "6": 18, "7": 20, "8": 22
};

let instruments = {
    'Trumpet': 56,
    'Grand Piano': 0,
    'Electric Piano': 5,
    'Organ': 19,
    'Acoustic Guitar': 24,
    'Electric Guitar': 26,
    'Violin': 40,
    'Cello': 42,
    'Saxophone': 65,
    'Flute': 73,
    'Clarinet': 71,
    'Bassoon': 70,
    'Voice': 91,
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

    const on = pitch => {
        if (pitch <= maxPitch)
            MIDI.noteOn(0, pitch, amplitude);
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

    const off = pitch => {
        if (pitch <= maxPitch)
            MIDI.noteOff(0, pitch);
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


/*
 * You need to write an event handling function for the instrument
 */


$(document).ready(function () {
    MIDI.loadPlugin({
        soundfontUrl: "../assets/midi-js/soundfont/",
        instruments: [
            "trumpet"
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
                    MIDI.getContext().resume().then(function () {
                        console.log("Audio Context is resumed!");
                    });
                }
            });

            // Hide the loading text and show the container
            $(".loading").hide();
            $(".container").show();

            // At this point the MIDI system is ready
            MIDI.setVolume(0, 127);     // Set the volume level
            MIDI.programChange(0, 56);  // Use the General MIDI 'trumpet' number

            // Set up the event handlers for all the buttons
            $("button").on("mousedown", handlePianoMouseDown);
            $(document).on("mouseup", handlePianoMouseUp);

            // Set up key events
            $(document).keydown(handlePageKeyDown);
            $(document).keyup(handlePageKeyUp);

            $("#instrument-select").on("change", e => {
                console.log(`Changed instrument to ${e.target.value}!`);
                MIDI.programChange(0, instruments[e.target.value]);
            });
        }
    });

    for (const inst in instruments) {
        $(`<option value="${inst}">${inst}</option>`).appendTo("#instrument-select");
    }
});
