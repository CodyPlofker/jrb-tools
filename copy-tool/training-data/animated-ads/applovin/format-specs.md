# AppLovin Video Ad Format Specifications

## Technical Requirements

### Video Codec
- **Required:** H.264 (AVC)
- **Container:** MP4
- **Profile:** High or Main

### Resolution Requirements
| Format | Dimensions | Aspect Ratio |
|--------|-----------|--------------|
| Interstitial | 1080x1920 | 9:16 (portrait) |
| Banner Large | 728x90 | 728:90 |
| Banner Small | 320x50 | 320:50 |
| Rewarded | 1080x1920 | 9:16 (portrait) |
| Native | 1200x627 | 1.91:1 |

### Frame Rate
- Minimum: 24fps
- Recommended: 30fps
- Maximum: 30fps (higher will be downscaled)

### Bitrate
- Minimum: 2 Mbps
- Recommended: 4-6 Mbps
- Maximum: 10 Mbps

### File Size
- Interstitial/Rewarded: Max 50MB (recommended <20MB)
- Banner: Max 2MB (recommended <500KB)
- Native: Max 10MB (recommended <5MB)

### Audio
- Codec: AAC
- Sample rate: 44.1kHz
- Bitrate: 128kbps stereo
- Volume: Normalized to -14 LUFS

## Format Details

### Interstitial (Portrait)
```
Aspect Ratio: 9:16
Dimensions: 1080x1920
Duration: 15-30 seconds
Max File Size: 50MB
```

**Safe Zones:**
- Top: 100px (close button area)
- Bottom: 100px (CTA button area)
- Left: 50px margin
- Right: 50px margin
- Safe content area: 980x1720

**Overlay Considerations:**
- Close button: Top-right corner (usually after 5s)
- Progress bar: May appear at bottom
- CTA button: Bottom center
- "Ad" label: Top-left corner

**Animation Timeline:**
```
0-2s:   Hook / Attention grab
2-10s:  Core message / Product showcase
10-15s: Value proposition
15-30s: CTA + hold
```

### Banner Large (728x90)
```
Aspect Ratio: 728:90 (~8.09:1)
Dimensions: 728x90
Duration: 6-15 seconds (looping)
Max File Size: 2MB
```

**Safe Zones:**
- All edges: 5px margin
- Keep critical content in center 70%
- Logo and CTA always visible

**Design Constraints:**
- Maximum 2-3 text elements
- Logo size: ~60x60 or smaller
- Font size: Minimum 12pt, recommended 14-16pt
- Animation: Subtle, not distracting

**Animation Timeline (6s loop):**
```
0-0.5s:  Initial state (logo + brand)
0.5-3s:  Message reveal
3-5s:    CTA emphasis
5-6s:    Return to initial / loop
```

### Banner Small (320x50)
```
Aspect Ratio: 320:50 (6.4:1)
Dimensions: 320x50
Duration: 6-15 seconds (looping)
Max File Size: 2MB
```

**Safe Zones:**
- All edges: 3px margin
- Extremely limited space

**Design Constraints:**
- Maximum 1-2 text elements
- Logo size: ~40x40 or icon only
- Font size: Minimum 10pt, recommended 12pt
- Animation: Very subtle

**Animation Timeline (6s loop):**
```
0-0.3s:  Initial state
0.3-3s:  Simple message
3-5.5s:  CTA visible
5.5-6s:  Loop transition
```

### Rewarded Video (Portrait)
```
Aspect Ratio: 9:16
Dimensions: 1080x1920
Duration: 15-30 seconds (30s max for full reward)
Max File Size: 50MB
```

**Safe Zones:**
- Top: 80px (timer/reward indicator)
- Bottom: 120px (CTA area)
- Left: 50px margin
- Right: 50px margin
- Safe content area: 980x1720

**Overlay Considerations:**
- Reward timer: Top area
- Skip button: May appear after set time
- Progress indicator: Bottom
- CTA: Bottom center

**Animation Timeline:**
```
0-3s:   Strong hook (user chose to watch)
3-15s:  Detailed message / Story
15-25s: Product showcase / Benefits
25-30s: CTA with clear value + hold
```

### Native (Landscape)
```
Aspect Ratio: 1.91:1
Dimensions: 1200x627
Duration: 6-15 seconds
Max File Size: 10MB
```

**Safe Zones:**
- All edges: 20px margin
- Title/icon overlay area: Top 60px
- CTA overlay area: Bottom 80px
- Safe content area: 1160x487

**Design Constraints:**
- Must work within content feed
- Should feel native to surrounding content
- Avoid aggressive animation
- Product-focused imagery preferred

**Animation Timeline:**
```
0-1s:   Subtle attention grab
1-6s:   Product/message reveal
6-10s:  Value proposition
10-15s: CTA appearance + hold
```

## VAST/VPAID Specifications

AppLovin supports VAST 2.0, 3.0, and 4.0 tags:

### VAST Requirements
- Linear video required
- MP4 media file required
- Tracking pixels supported
- Companion ads optional

### Sample VAST Structure
```xml
<VAST version="3.0">
  <Ad id="ad-id">
    <InLine>
      <AdSystem>AppLovin</AdSystem>
      <AdTitle>Your Ad Title</AdTitle>
      <Creatives>
        <Creative>
          <Linear>
            <Duration>00:00:15</Duration>
            <MediaFiles>
              <MediaFile delivery="progressive" type="video/mp4"
                         width="1080" height="1920" bitrate="4000">
                https://your-video-url.mp4
              </MediaFile>
            </MediaFiles>
          </Linear>
        </Creative>
      </Creatives>
    </InLine>
  </Ad>
</VAST>
```

## Animation Export Settings

### Creatomate Export
```json
{
  "output_format": "mp4",
  "width": 1080,
  "height": 1920,
  "frame_rate": 30,
  "quality": "high",
  "codec": "h264",
  "max_size": "20MB"
}
```

### Banner Export (Animated GIF fallback)
```json
{
  "output_format": "gif",
  "width": 728,
  "height": 90,
  "frame_rate": 15,
  "quality": "medium",
  "max_size": "500KB"
}
```

## Duration Best Practices

### By Format
| Format | Minimum | Optimal | Maximum |
|--------|---------|---------|---------|
| Interstitial | 15s | 15-20s | 30s |
| Banner Large | 6s | 6-10s | 15s |
| Banner Small | 6s | 6s | 10s |
| Rewarded | 15s | 25-30s | 30s |
| Native | 6s | 10-15s | 15s |

### By Objective
| Objective | Recommended Duration |
|-----------|---------------------|
| App Install | 15-20 seconds |
| Brand Awareness | 15-25 seconds |
| Product Showcase | 20-30 seconds |
| Flash Sale | 10-15 seconds |

## Quality Checklist

- [ ] Correct dimensions for format
- [ ] Resolution meets minimum (1080p for interstitial/rewarded)
- [ ] 30fps frame rate
- [ ] File size within limits
- [ ] H.264 codec
- [ ] Audio normalized (if applicable)
- [ ] Duration within format limits
- [ ] Content within safe zones
- [ ] Close button area clear (interstitial)
- [ ] CTA clearly visible
- [ ] Loops smoothly (if looping format)
- [ ] Works without audio

## Network Delivery Considerations

- Mobile data connections vary widely
- File size directly impacts load time
- Consider quality vs. file size tradeoff
- Smaller files = faster start = less abandonment

### Recommended File Sizes by Connection
| Connection | Max Recommended Size |
|------------|---------------------|
| 3G | 5MB |
| 4G | 15MB |
| 5G/WiFi | 50MB |
