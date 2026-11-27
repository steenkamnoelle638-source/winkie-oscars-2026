# Overall winner videos

`curtains-overlay.webm` is the transparent theater-curtain overlay used by the overall-winner reveal. Leave this file in place; it is not a contestant clip.

The overall reveal looks for a video file based on the contestant's current display name. Add each real clip to this folder as an MP4, using lowercase letters and hyphens between name parts:

- `lian-jacobs.mp4` — Lian Jacobs
- `mieke-smit.mp4` — Mieke Smit
- `jaco-nel.mp4` — Jaco Nel
- `mia-botha.mp4` — Mia Botha
- `talia-roos.mp4` — Talia Roos
- `deelnemer-6.mp4` — Deelnemer 6
- `deelnemer-7.mp4` — Deelnemer 7

The site's ranking chooses the actual person for each position. It then tries that person's matching filename for the third-place, second-place, or first-place video. If the MP4 is not present yet, the reveal shows a moving placeholder with that person's name and the expected filename. Once an MP4 is added, it plays in the same position instead.

Use H.264 MP4 for the widest browser support. Landscape 16:9 footage fits the stage best. The built-in player starts muted for reliable autoplay and shows controls so a host can turn on clip audio. If you later change a contestant's display name, rename that person's file to the new normalized name as well.
