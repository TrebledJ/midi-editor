# midi-editor
Browser-based MIDI editor, designed for a project on multimedia computing (COMP4431).

## Overview
This project consists of a midi editor with support to import audio via microphone or file upload. Audio is sent to a server backend, which converts the waveform into MIDI and sends it back to the client.

The current backend conversion is somewhat jank and limited, but there are plans to improve it (PRs welcome).

## Setup
1. Install Python requirements:
    ```
    pip install -r requirements.txt
    ```

2. [Download `ffmpeg`](https://ffmpeg.org/), if not installed. This is used to convert recordings (webm) to wav; so if it's optional if you don't plan on using the recording function.

3. To run the server:
    ```
    python app.py
    ```


