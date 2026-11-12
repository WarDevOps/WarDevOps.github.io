const placeholders = {
  tank: "/Tier/Tank/Placeholder_Ground.webp",
  air: "/Tier/Air/Placeholder_Air.webp",
  heli: "/Tier/Heli/Placeholder_Heli.webp",
};
const folders = { tank: "Tank", air: "Air", heli: "Heli" };

export const placeholderImage = category => placeholders[category];
export const imagePendingText = language => language === "ko" ? "이미지 준비 중입니다." : "Image coming soon.";

export function vehicleImageSource(unit, category, revision = "current") {
  return unit.imageAvailable === false ? placeholderImage(category)
    : `/Tier/${folders[category]}/${encodeURIComponent(unit.file)}?v=${encodeURIComponent(revision)}`;
}

// An unavailable image and a failed image request use the same category fallback.
export function setVehicleImage(image, overlay, unit, category, revision, onChange = () => {}) {
  let isPlaceholder = unit.imageAvailable === false;
  image.hidden = false;
  overlay.hidden = !isPlaceholder;
  image.onerror = () => {
    if (isPlaceholder) {
      image.hidden = true;
    } else {
      isPlaceholder = true;
      overlay.hidden = false;
      image.src = placeholderImage(category);
    }
    onChange();
  };
  image.src = vehicleImageSource(unit, category, revision);
}
