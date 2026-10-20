# Chyron

A browser app for putting news-style text graphics over videos: headlines, labels, name bars, quotes, source credits, logos and SRT subtitles, exported as an MP4.

Everything runs in your browser. Videos are never uploaded anywhere.

**Use it:** https://discomystery.github.io/chyron/ (Chrome works best), or open `index.html` from a downloaded copy.

**Install it:** on the site, click **Install app** in the top bar (on a phone it's in the ⋮ menu). Chrome and Edge install it directly; Safari shows the steps (File → Add to Dock on a Mac, Share → Add to Home Screen on iPhone). It then opens in its own window and works offline.

**On a phone:** the same site switches to a phone layout. The video sits on top with tool rails either side of it (graphics to add on the left, actions for the selected graphic or clip on the right), then the timeline, then the editing panel, with icon tabs along the bottom for Text, Style, Color and Timing. After export, **Save or share** opens the share sheet so the video can go straight to Photos.

**Covers:** add a Cover to hide part of the video, such as another channel's on-screen titles. It can be a solid color, a gradient that fades from one edge, or a blur of whatever is underneath (with soft edges that fade the blur out towards its sides). Drag it into place and resize it from the right and bottom edges (or set width and height as percentages). Like other graphics it fades in and out, and its timing follows its bar in the timeline.

**Reframing a clip:** select a video clip, then drag the video to move it in the frame and pinch (or scroll) to zoom. Changing it at another moment adds a keyframe there, shown as a diamond on the clip. Each keyframe either **jumps** (holds, then cuts to the new framing) or **glides** (moves smoothly from the keyframe before).

Video export uses [Mediabunny](https://mediabunny.dev) (MPL-2.0), included unmodified in `vendor/`. Icons are from [Phosphor](https://phosphoricons.com) (MIT).
