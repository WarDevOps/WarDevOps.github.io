## WarDevOps
Explore key engagement areas and movement routes for every War Thunder Ground Battles map with WarDevOps MapTactic.

### Area overlay image names

Place optional transparent PNG overlays in the same folder as the map image. Use these lowercase file names:

| Area | Shared | Blue | Red |
| --- | --- | --- | --- |
| Danger area | `d.png` | `db.png` | `dr.png` |
| Not recommended | `n.png` | `nb.png` | `nr.png` |
| Core area | `c.png` | `cb.png` | `cr.png` |
| Spawn area | `s.png` | `sb.png` | `sr.png` |
| Anti-air area | `a.png` | `ab.png` | `ar.png` |

Shared overlays are visible for both teams. A Blue or Red overlay is visible only for that team and is layered with the shared overlay when both files exist. Existing long-form file names such as `DangerArea.png` remain supported for compatibility, but new overlays should use the short names above.
