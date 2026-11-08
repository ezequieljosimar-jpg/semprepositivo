"""Render two original, deterministic instrumental compositions locally.

Requires numpy and ffmpeg. No samples, network services or external music.
Intermediate PCM lives in /tmp; finished tracks are served by the app.
"""
from pathlib import Path
import subprocess
import tempfile
import numpy as np

RATE = 44100
DURATION = 96
OUTPUT = Path(__file__).resolve().parents[1] / "public" / "audio"


def frequency(note):
    return 440 * 2 ** ((note - 69) / 12)


def add_note(mix, note, start, duration, level, piano=False, pan=0):
    begin = round(start * RATE)
    length = min(round(duration * RATE), len(mix) - begin)
    if length <= 0:
        return
    t = np.arange(length) / RATE
    f = frequency(note)
    if piano:
        # Decaying, slightly inharmonic strings with softer upper partials.
        tone = sum((1 / h ** 1.7) * np.sin(2 * np.pi * f * h * (1 + h * h * .00004) * t)
                   * np.exp(-t * (.38 + h * .13)) for h in range(1, 7))
        envelope = (1 - np.exp(-t / .014)) * np.minimum(1, (duration - t) / .8)
    else:
        tone = (np.sin(2 * np.pi * f * t) + .22 * np.sin(2 * np.pi * f * 2.002 * t)
                + .12 * np.sin(2 * np.pi * f * .998 * t))
        envelope = np.sin(np.pi * t / duration) ** 2
    signal = tone * envelope * level
    mix[begin:begin + length, 0] += signal * np.sqrt((1 - pan) / 2)
    mix[begin:begin + length, 1] += signal * np.sqrt((1 + pan) / 2)


def render(name, piano):
    mix = np.zeros((RATE * DURATION, 2), dtype=np.float64)
    chords = ([[48, 55, 60, 64], [45, 52, 57, 60], [53, 60, 65, 69], [43, 50, 55, 62]]
              if piano else [[50, 57, 62, 66], [47, 54, 59, 62], [43, 50, 57, 62], [45, 52, 59, 64]])
    melodies = ([[76, 74, 72, 67], [72, 69, 67, 64], [69, 72, 77, 76], [74, 71, 67, 62]]
                if piano else [[74, 69, 66], [71, 66, 62], [69, 74, 71], [76, 71, 69]])
    for bar in range(8):
        start = bar * 12
        for j, note in enumerate(chords[bar % 4]):
            add_note(mix, note, start + (j * .35 if piano else 0), 11.8,
                     .14 if piano else .065, piano, (j - 1.5) * .18)
        for j, note in enumerate(melodies[bar % 4]):
            add_note(mix, note, start + 1.5 + j * (2.6 if piano else 3),
                     6 if piano else 9, .095 if piano else .04, piano, .12 if j % 2 else -.12)
    # Quiet stereo echoes create space without obscuring the melodies.
    dry = mix.copy()
    for delay, gain in [(.23, .12), (.47, .09), (.79, .05), (1.13, .025)]:
        offset = round(delay * RATE)
        mix[offset:] += dry[:-offset, ::-1] * gain
    fade = np.minimum(1, np.arange(len(mix)) / (RATE * 3))
    fade *= np.minimum(1, np.arange(len(mix))[::-1] / (RATE * 4))
    mix *= fade[:, None]
    mix *= .48 / max(1, np.max(np.abs(mix)))
    OUTPUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="ambient-render-") as temporary:
        pcm = Path(temporary) / "track.f32"
        mix.astype("<f4").tofile(pcm)
        subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "f32le", "-ar", str(RATE),
                        "-ac", "2", "-i", str(pcm), "-codec:a", "libmp3lame", "-b:a", "160k",
                        "-metadata", f"title={name}", str(OUTPUT / f"{name}.mp3")], check=True)


if __name__ == "__main__":
    render("oracao", piano=True)
    render("descanso", piano=False)