var currentEffect = null; // The current effect applying to the videos

var outputDuration = 0; // The duration of the output video
var outputFramesBuffer = []; // The frames buffer for the output video
var currentFrame = 0; // The current frame being processed
var completedFrames = 0; // The number of completed frames

// This function starts the processing of an individual frame.
function processFrame() {
    if (currentFrame < outputDuration) {
        currentEffect.process(currentFrame);
        currentFrame++;
    }
}

// This function is called when an individual frame is finished.
// If all frames are completed, it takes the frames stored in the
// `outputFramesBuffer` and builds a video. The video is then set as the 'src'
// of the <video id='output-video'></video>.
function finishFrame() {
    completedFrames++;
    if (completedFrames < outputDuration) {
        updateProgressBar("#effect-progress", completedFrames / outputDuration * 100);

        if (stopProcessingFlag) {
            stopProcessingFlag = false;
            $("#progress-modal").modal("hide");
        } else {
            setTimeout(processFrame, 1);
        }
    }
    else {
        buildVideo(outputFramesBuffer, function (resultVideo) {
            $("#output-video").attr("src", URL.createObjectURL(resultVideo));
            updateProgressBar("#effect-progress", 100);
            $("#progress-modal").modal("hide");
        });
    }
}

// Definition of various video effects
//
// `effects` is an object with unlimited number of members.
// Each member of `effects` represents an effect.
// Each effect is an object, with two member functions:
// - setup() which responsible for gathering different parameters
//           of that effect and preparing the output buffer
// - process() which responsible for processing of individual frame
var effects = {
    reverse: {
        setup: function () {
            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function (idx) {
            // Put the frames in reverse order
            outputFramesBuffer[idx] = input1FramesBuffer[(outputDuration - 1) - idx];

            // Notify the finish of a frame
            finishFrame();
        }
    },

    fadeInOut: {
        setup: function () {
            // Prepare the parameters
            this.fadeInDuration = Math.round(parseFloat($("#fadeIn-duration").val()) * frameRate);
            this.fadeOutDuration = Math.round(parseFloat($("#fadeOut-duration").val()) * frameRate);

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function (idx) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');


            /*
             * TODO: Calculate the multiplier
             */

            var multiplier = 1;
            if (idx < this.fadeInDuration) {
                var fadeInRatio = (idx - 0) / (this.fadeInDuration - 0);
                multiplier = (1.0 - 0.0) * fadeInRatio;
            }
            else if (idx > outputDuration - this.fadeOutDuration) {
                var current = (outputDuration - this.fadeInDuration);
                var fadeOutRatio = (idx - current) / (this.fadeOutDuration);
                multiplier = 1.0 - ((1.0 - 0.0) * fadeOutRatio);
            }


            // Modify the image content based on the multiplier
            var img = new Image();
            img.onload = function () {
                // Get the image data object
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, w, h);


                /*
                 * TODO: Modify the pixels
                 */
                for (var i = 0; i < imageData.data.length; i += 4) {
                    // console.log(imageData.data[i]);
                    imageData.data[i] = (imageData.data[i] * multiplier);
                    imageData.data[i + 1] = (imageData.data[i + 1] * multiplier);
                    imageData.data[i + 2] = (imageData.data[i + 2] * multiplier);
                    // imageData.data[i + 3] = (imageData.data[i + 3] * multiplier);
                }


                // Store the image data as an output frame
                ctx.putImageData(imageData, 0, 0);
                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },

    motionBlur: {
        setup: function () {
            // Prepare the parameters
            this.blurFrames = parseInt($("#blur-frames").val());

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);

            // Prepare a buffer of frames (as ImageData)
            this.imageDataBuffer = [];
        },
        process: function (idx, parameters) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');

            // Need to store them as local variables so that
            // img.onload can access them
            var imageDataBuffer = this.imageDataBuffer;
            var blurFrames = this.blurFrames;


            // Combine frames into one
            var img = new Image();
            img.onload = function () {
                // Get the image data object of the current frame
                ctx.drawImage(img, 0, 0);
                var imageData = ctx.getImageData(0, 0, w, h);


                /*
                 * TODO: Manage the image data buffer
                 */

                // Add current frame
                imageDataBuffer.push(imageData);

                // Overflowing Checking
                if (imageDataBuffer.length > blurFrames) {
                    imageDataBuffer.shift();
                }

                // console.log("buffer", imageDataBuffer.length);
                // console.log("frame",imageData.data.length);


                // Create a blank image data
                imageData = new ImageData(w, h);



                /*
                 * TODO: Combine the image data buffer into one frame
                 */

                for (var i = 0; i < imageData.data.length; i += 4) {
                    // Set black pixel
                    var red = 0;
                    var green = 0;
                    var blue = 0;
                    var alpha = 255;

                    for (var j = 0; j < imageDataBuffer.length; j++) {

                        var current = imageDataBuffer[j];
                        red += current.data[i];
                        green += current.data[i + 1];
                        blue += current.data[i + 2];
                    }
                    imageData.data[i] = red / blurFrames;
                    imageData.data[i + 1] = green / blurFrames;
                    imageData.data[i + 2] = blue / blurFrames;
                    imageData.data[i + 3] = alpha;

                }


                // Store the image data as an output frame
                ctx.putImageData(imageData, 0, 0);
                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },
    earthquake: {
        setup: function () {
            // Prepare the parameters
            this.strength = parseInt($("#earthquake-strength").val());

            // Initialize the duration of the output video
            outputDuration = input1FramesBuffer.length;

            // Prepare the array for storing the output frames
            outputFramesBuffer = new Array(outputDuration);
        },
        process: function (idx, parameters) {
            // Use a canvas to store frame content
            var w = $("#input-video-1").get(0).videoWidth;
            var h = $("#input-video-1").get(0).videoHeight;
            var canvas = getCanvas(w, h);
            var ctx = canvas.getContext('2d');


            /*
             * TODO: Calculate the placement of the output frame
             */

            var strength = this.strength;
            var dx = (Math.random() + Math.random()) * strength;
            var dy = (Math.random() + Math.random()) * strength;
            var sw = w - 2 * strength;
            var sh = h - 2 * strength;


            // Draw the input frame in a new location and size
            var img = new Image();
            img.onload = function () {


                /*
                 * TODO: Draw the input frame appropriately
                 */
                ctx.drawImage(img, 0, 0);
                ctx.drawImage(img, dx, dy, sw, sh, 0, 0, w, h);


                outputFramesBuffer[idx] = canvas.toDataURL("image/webp");

                // Notify the finish of a frame
                finishFrame();
            };
            img.src = input1FramesBuffer[idx];
        }
    },
    crossFade: {
        setup: function () {
            // Prepare the parameters
            this.crossFadeDuration =
                Math.round(parseFloat($("#crossFade-duration").val()) * frameRate);

            /*
             * TODO: Prepare the duration and output buffer
             */

            // Initialize the duration of the output video
            var crossFadeDuration = this.crossFadeDuration;
            outputDuration = input1FramesBuffer.length + input2FramesBuffer.length - crossFadeDuration;

            // Prepare the array for storing the output frames
            var transition1 = new Array(crossFadeDuration);
            var transition2 = new Array(crossFadeDuration);
            outputFramesBuffer = new Array(outputDuration);


        },
        process: function (idx) {


            /*
             * TODO: Make the transition work
             */

            // Video 1
            var w1 = $("#input-video-1").get(0).videoWidth;
            var h1 = $("#input-video-1").get(0).videoHeight;
            var canvas1 = getCanvas(w1, h1);
            var ctx1 = canvas1.getContext('2d');

            // // Video 2
            // var w2 = $("#input-video-2").get(0).videoWidth;
            // var h2 = $("#input-video-2").get(0).videoHeight;
            // var canvas2 = getCanvas(w2, h2);
            // var ctx2 = canvas2.getContext('2d');

            // Periods
            var crossFadeDuration = this.crossFadeDuration;
            var video1period = input1FramesBuffer.length - crossFadeDuration;
            var transitionend = input1FramesBuffer.length;
            var multiplier1;
            var multiplier2;
            var buffer = [w1 * h1 * 4];
            // var transition1 = new Array(outputDuration);
            // var transition2 = new Array(outputDuration);
            // console.log(w1*h1);

            if ((idx > video1period) && (idx < transitionend)) {
                var crossfadeRatio = (idx - video1period) / (crossFadeDuration - 0);
                multiplier2 = (1.0 - 0.0) * crossfadeRatio;
                multiplier1 = 1.0 - multiplier2;
            }


            if (idx <= video1period) {
                outputFramesBuffer[idx] = input1FramesBuffer[idx];
                finishFrame();
            }
            else if (idx < transitionend) {
                var img = new Image();
                // console.log("current",idx);
                // console.log("shit",transitionend);
                img.onload = function () {
                    // Get the image data object
                    ctx1.drawImage(img, 0, 0);
                    var imageData = ctx1.getImageData(0, 0, w1, h1);





                    /*
                     * TODO: Modify the pixels
                     */

                    // console.log("mul1",multiplier1);
                    // console.log("data",imageData.data.length);
                    for (var i = 0; i < imageData.data.length; i += 4) {
                        // console.log(imageData.data[i]);
                        imageData.data[i] = Math.round(imageData.data[i] * multiplier1);
                        imageData.data[i + 1] = Math.round(imageData.data[i + 1] * multiplier1);
                        imageData.data[i + 2] = Math.round(imageData.data[i + 2] * multiplier1);
                        // imageData.data[i + 3] = (imageData.data[i + 3] * multiplier);
                        buffer[i] = imageData.data[i];
                        buffer[i + 1] = imageData.data[i + 1];
                        buffer[i + 2] = imageData.data[i + 2];
                        buffer[i + 3] = imageData.data[i + 3];

                    }
                };
                img.src = input1FramesBuffer[idx];

                var img2 = new Image();
                // console.log("current",idx);
                img2.onload = function () {
                    // Get the image data object
                    ctx1.drawImage(img2, 0, 0);
                    var imageData = ctx1.getImageData(0, 0, w1, h1);


                    // console.log("data2",imageData.data.length);
                    for (var i = 0; i < imageData.data.length; i += 4) {
                        // console.log(imageData.data[i]);
                        imageData.data[i] = Math.round(imageData.data[i] * multiplier2 + buffer[i]);
                        imageData.data[i + 1] = Math.round(imageData.data[i + 1] * multiplier2 + buffer[i + 1]);
                        imageData.data[i + 2] = Math.round(imageData.data[i + 2] * multiplier2 + buffer[i + 2]);
                        // imageData.data[i + 3] = (imageData.data[i + 3] * multiplier);
                    }


                    // Store the image data as an output frame
                    ctx1.putImageData(imageData, 0, 0);
                    outputFramesBuffer[idx] = canvas1.toDataURL("image/webp");

                
                    // Notify the finish of a frame
                    finishFrame();
                };
                img2.src = input2FramesBuffer[idx - video1period];



            }
            else {
                outputFramesBuffer[idx] = input2FramesBuffer[idx - input1FramesBuffer.length + crossFadeDuration];
                finishFrame();
            }



        }





    }
};

// Handler for the "Apply" button click event
function applyEffect(e) {
    $("#progress-modal").modal("show");
    updateProgressBar("#effect-progress", 0);

    // Check which one is the actively selected effect
    switch (selectedEffect) {
        case "fadeInOut":
            currentEffect = effects.fadeInOut;
            break;
        case "reverse":
            currentEffect = effects.reverse;
            break;
        case "motionBlur":
            currentEffect = effects.motionBlur;
            break;
        case "earthquake":
            currentEffect = effects.earthquake;
            break;
        case "crossFade":
            currentEffect = effects.crossFade;
            break;
        default:
            // Do nothing
            $("#progress-modal").modal("hide");
            return;
    }

    // Set up the effect
    currentEffect.setup();

    // Start processing the frames
    currentFrame = 0;
    completedFrames = 0;
    processFrame();
}
