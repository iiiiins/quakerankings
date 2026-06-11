// Per-game logo PNGs, keyed by the exact Game strings stored in Supabase.
import diaboticalLogo from "../logos/diabotical_logo.png";
import quakeWorldLogo from "../logos/quakeworld_logo.png";
import quake2Logo from "../logos/quake2_logo.png";
import quake3Logo from "../logos/quake3_logo.png";
import quake4Logo from "../logos/quake4_logo.png";
import quakeLiveLogo from "../logos/quakelive_logo.png";
import quakeChampionsLogo from "../logos/quakechampions_logo.png";

const gameLogos = {
  Diabotical: diaboticalLogo,
  "Quake World": quakeWorldLogo,
  "Quake 2": quake2Logo,
  "Quake 3": quake3Logo,
  "Quake 4": quake4Logo,
  "Quake Live": quakeLiveLogo,
  "Quake Champions": quakeChampionsLogo,
};

export default gameLogos;
