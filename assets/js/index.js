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
    // const preload_instruments = Instrument.instruments.map(([x, _]) => x);
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
            // $(".loading").hide();
            // $(".container").show();

            // At this point the MIDI system is ready
            MIDI.setVolume(0, 127); // Set the volume level
            MIDI.programChange(0, 56); // Use the General MIDI 'trumpet' number
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
        const vol = DOM.roll.ch(c).volume;
        console.log(`changing instrument ${c} volume: ${vol}`);
        MIDI.setVolume(c, vol);
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
        console.log("note clicked:", note);
        const { t, n, g, v, ch } = note;
        $("#pitch-control").val(n);
        $("#duration-control").val(g);
        $("#velocity-control").val(v);
        $("#channel-control").val(ch + 1);
    };

    DOM.roll.onNoteClicked({
        n: 60,
        g: 1,
        v: DOM.roll.defaultVelocity,
        ch: DOM.roll.selectedChannel,
    });

    $("#pitch-control").on("change", () => {
        const n = Number($("#pitch-control").val());
        console.log(`changed pitch to ${n}`);
        DOM.roll.updateSelectedAttribute("n", n);
    });

    $("#duration-control").on("change", () => {
        const d = Number($("#duration-control").val());
        console.log(`changed duration to ${d}`);
        DOM.roll.updateSelectedAttribute("g", d);
    });

    $("#velocity-control").on("change", () => {
        const v = Number($("#velocity-control").val());
        console.log(`changed velocity to ${v}`);
        if (!DOM.roll.updateSelectedAttribute("v", v)) {
            DOM.roll.defaultVelocity = v;
        }
    });

    $("#channel-control").on("change", () => {
        const ch = Number($("#channel-control").val()) - 1;
        console.log(`changed channel to ${ch}`);
        if (!DOM.roll.updateSelectedAttribute("ch", ch)) {
            DOM.roll.selectedChannel = ch;
        }
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
    for (let i = 0; i < DOM.roll.numChannels; i++) {
        $(`#instrument-select-${i + 1} option`)
            .eq(2 * i)
            .prop("selected", true);
    }

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
