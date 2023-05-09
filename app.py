from flask import *
import base64
import subprocess
from hashlib import md5
from binascii import hexlify


app = Flask(__name__)


@app.route('/')
def get_index():
    return send_from_directory('.', 'index.html')

@app.route('/favicon.ico')
def get_icon():
    return send_from_directory('.', 'favicon.ico')

@app.route('/assets/<path:path>')
def get_asset(path):
    return send_from_directory('assets', path)


filename = 'tmp/audio.wav'
filename_out = 'tmp/audio.mid'
filename_webm = 'tmp/audio.webm'


def audio_to_midi(options=[]):
    print('converting to midi...')
    res = subprocess.run(['audio-to-midi', *options, '-o', filename_out, filename])
    res.check_returncode()
    print('process finished!')

def webm_to_wav():
    print('converting to webm to wav...')
    res = subprocess.run(['ffmpeg', '-y', '-i', filename_webm, '-vn', filename])
    res.check_returncode()
    print('process finished!')


@app.route('/transform', methods=['POST'])
def convert_audio_to_midi():
    if 'data' not in request.files and 'file' not in request.files:
        abort(400)

    key = 'data' if 'data' in request.files else 'file'
    file = request.files[key]
    if file.filename.endswith('.webm'):
        # Handle webm specially.
        file.save(filename_webm)
        webm_to_wav()
    else:
        file.save(filename)

    params = [
        '-b 120', # BPM
        '-B 1/8', # Beat, time window division
        '-m', # Condense using max velocity
        '-s', # Only add loudest note
        '-a 0.2', # Threshold
        '-T -12', # Transpose
    ]

    audio_to_midi(' '.join(params).split())

    with open(filename_out, 'rb') as f:
        midi = f.read()

    print(f'midi: {len(midi)}B')

    encoded = base64.b64encode(midi)
    checksum = hexlify(md5(encoded).digest()).decode()

    print(f'checksum: {checksum}')


    response = {
        'midi': encoded.decode(),
        'checksum': checksum,
    }
    return jsonify(response)


if __name__ == '__main__':
    # To watch and reload when other files are changed:
    # import os
    # listall = lambda dir: [os.path.join(dp, f) for dp, dn, fn in os.walk(os.path.expanduser(dir)) for f in fn]

    app.run(port=5000, debug=True)