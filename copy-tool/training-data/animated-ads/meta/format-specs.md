# Meta Video Ad Format Specifications

## Technical Requirements

### Video Codec
- **Preferred:** H.264 (AVC) or H.265 (HEVC)
- **Container:** MP4 or MOV
- **Aspect ratio:** Maintain source, no letterboxing

### Resolution Requirements
| Format | Minimum | Recommended | Maximum |
|--------|---------|-------------|---------|
| Feed (4:5) | 600x750 | 1080x1350 | 4096x5120 |
| Stories (9:16) | 600x1067 | 1080x1920 | 4096x7282 |
| Reels (9:16) | 600x1067 | 1080x1920 | 4096x7282 |
| Square (1:1) | 600x600 | 1080x1080 | 4096x4096 |

### Frame Rate
- Minimum: 24fps
- Recommended: 30fps
- Maximum: 60fps (will be downscaled to 30fps)

### Bitrate
- Minimum: 3 Mbps
- Recommended: 8-12 Mbps for 1080p
- Higher bitrate = better quality but larger file

### File Size
- Maximum: 4GB
- Recommended: Under 1GB for faster upload/processing

### Audio
- Codec: AAC
- Sample rate: 44.1kHz or 48kHz
- Bitrate: 128kbps stereo recommended
- Loudness: -14 LUFS (Facebook standard)

## Format Details

### Feed Video (4:5)
```
Aspect Ratio: 4:5 (0.8:1)
Dimensions: 1080x1350
Duration: 1 second to 240 minutes (15-30s recommended)
Caption Length: 125 characters primary text
                40 characters headline
```

**Safe Zones:**
- Top: 54px margin
- Bottom: 54px margin
- Left: 54px margin
- Right: 54px margin

**Overlay Considerations:**
- Profile picture and name appear at top left
- Like/comment/share buttons at bottom
- Caption text appears below video
- Volume/expand controls at bottom right

### Stories Video (9:16)
```
Aspect Ratio: 9:16 (0.5625:1)
Dimensions: 1080x1920
Duration: 1-15 seconds (can split into multiple cards)
Primary Text: 125 characters
```

**Safe Zones:**
- Top: 250px (profile + story indicators)
- Bottom: 250px (CTA button, swipe up area)
- Left: 50px margin
- Right: 50px margin
- Center safe zone: 1080x1420 (most important area)

**Overlay Considerations:**
- Profile picture top left
- Story progress bar at very top
- "Sponsored" label top left below profile
- CTA button at bottom center
- Swipe up indicator at bottom

### Reels Video (9:16)
```
Aspect Ratio: 9:16 (0.5625:1)
Dimensions: 1080x1920
Duration: 15-60 seconds (15-30s recommended for ads)
Primary Text: 72 characters
```

**Safe Zones:**
- Top: 200px (search, create buttons)
- Bottom: 300px (engagement buttons, caption)
- Left: 50px margin
- Right: 100px margin (action buttons)
- Center safe zone: 880x1420

**Overlay Considerations:**
- Like/comment/share buttons on right side
- Audio and creator info at bottom
- Caption text at bottom left
- Profile picture bottom left
- More prominent UI than Stories

### Square Video (1:1)
```
Aspect Ratio: 1:1
Dimensions: 1080x1080
Duration: 1 second to 240 minutes (15s recommended)
Caption Length: 125 characters primary text
```

**Safe Zones:**
- All edges: 54px margin
- Even distribution of margins

**Overlay Considerations:**
- Works in multiple placements
- Caption below in feed
- Good for carousel first card

## Animation Export Settings

### Creatomate Export
```json
{
  "output_format": "mp4",
  "width": 1080,
  "height": 1920,
  "frame_rate": 30,
  "quality": "high",
  "codec": "h264"
}
```

### After Effects Export (for reference)
- Format: H.264
- Profile: High
- Level: 4.2
- Render at Maximum Depth: Yes
- Frame Blending: On

## Duration Best Practices

### By Objective
| Objective | Recommended Duration |
|-----------|---------------------|
| Brand Awareness | 6-15 seconds |
| Consideration | 15-30 seconds |
| Conversion | 6-15 seconds |
| Retargeting | 6 seconds |

### By Placement
| Placement | Sweet Spot |
|-----------|-----------|
| Feed | 15 seconds |
| Stories | 15 seconds (full card) |
| Reels | 15-30 seconds |
| In-Stream | 5-15 seconds |

## Thumbnail Considerations

- First frame or custom thumbnail should:
  - Be compelling as a still image
  - Include text if possible
  - Show the product/offer clearly
  - Work at small sizes (mobile feed)

## Quality Checklist

- [ ] Correct aspect ratio for placement
- [ ] Resolution at least 1080p
- [ ] 30fps frame rate
- [ ] Audio at -14 LUFS (if applicable)
- [ ] File under 1GB
- [ ] Duration appropriate for placement
- [ ] Key content in safe zones
- [ ] First frame works as thumbnail
- [ ] No letterboxing/pillarboxing
