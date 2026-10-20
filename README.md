# Chyron

A browser app for putting news-style text graphics over videos: headlines, labels, name bars, quotes, source credits, logos and SRT subtitles, exported as an MP4.

Everything runs in your browser. Videos are never uploaded anywhere.

**Use it:** https://discomystery.github.io/chyron/ (Chrome works best), or open `index.html` from a downloaded copy.

**Install it:** on the site, click **Install app** in the top bar (on a phone it's in the ⋮ menu). Chrome and Edge install it directly; Safari shows the steps (File → Add to Dock on a Mac, Share → Add to Home Screen on iPhone). It then opens in its own window and works offline.

**On a phone:** the same site switches to a phone layout. The video sits on top with tool rails either side of it (graphics to add on the left, actions for the selected graphic or clip on the right), then the timeline, then the editing panel, with icon tabs along the bottom for Text, Style, Color and Timing. After export, **Save or share** opens the share sheet so the video can go straight to Photos.

**Covers:** add a Cover to hide part of the video, such as another channel's on-screen titles. It can be a solid color or a blur of whatever is underneath, and either can have soft edges, on all sides or just one (a solid cover softened on one side works as a gradient). Drag it into place and resize it from the right and bottom edges (or set width and height as percentages). Like other graphics it fades in and out, and its timing follows its bar in the timeline.

**Subtitles:** add an SRT or VTT file and the lines follow the video they were made for, so they stay in sync when you trim, split or reorder clips. For subtitles made from the finished edit, set them to follow the timeline instead.

**Safe zones:** pick TikTok, Reels or Shorts under Safe zones to shade, roughly, where each app's buttons and captions sit over a vertical video. They're only shown while editing, never exported.

**Exporting several shapes:** Export lets you tick Vertical 9:16, Portrait 4:5, Square 1:1 and Wide 16:9 and makes one video of each, named by shape. Graphics keep their places in the frame and each clip stays centred on the same part of its picture.

**Cover image:** Cover image opens a picker with a preview, a strip of frames and a scrubber. Choose the moment, with or without graphics, and save it as a JPEG in one or more shapes. The chosen moment is marked on the timeline.

**Layers:** drag a graphic's name in the timeline up or down to change what sits in front.

**Reframing a clip:** select a video clip (the rest of its picture shows dimmed around the frame), then drag the video to move it in the frame and pinch (or scroll) to zoom. Changing it at another moment adds a keyframe there, shown as a diamond on the clip. Each keyframe either **jumps** (holds, then cuts to the new framing) or **glides** (moves smoothly from the keyframe before). Drag a diamond to retime its keyframe (it snaps to the clip's ends and to where graphics start or end); hold Option/Alt while dragging to copy it instead.

Video export uses [Mediabunny](https://mediabunny.dev) (MPL-2.0), included unmodified in `vendor/`. Icons are from [Phosphor](https://phosphoricons.com) (MIT).
