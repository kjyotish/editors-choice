export function getSongDescription(song = {}) {
  const directDescription =
    typeof song.viral_para === "string" ? song.viral_para.trim() : "";

  if (directDescription) {
    return directDescription;
  }

  const tip = typeof song.tip === "string" ? song.tip.trim() : "";
  return tip;
}

export function getSongYouTubeLink(song = {}) {
  const explicitLink =
    typeof song.yt_link === "string" ? song.yt_link.trim() : "";

  if (explicitLink) {
    return explicitLink;
  }

  const title = typeof song.title === "string" ? song.title.trim() : "";
  const query = title || "song";
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}
