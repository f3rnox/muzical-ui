export type MusicBrainzArtistCredit = {
  name?: string;
  artist?: { name?: string };
};

export type MusicBrainzReleaseRef = {
  id?: string;
  title?: string;
  status?: string;
  "release-group"?: { title?: string };
};

export type MusicBrainzRecording = {
  id: string;
  title: string;
  length?: number;
  "artist-credit"?: MusicBrainzArtistCredit[];
  releases?: MusicBrainzReleaseRef[];
};

export type MusicBrainzReleaseGroup = {
  id: string;
  title: string;
  "first-release-date"?: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
  releases?: Array<{ id: string; title?: string; status?: string }>;
};

export type MusicBrainzReleaseTrack = {
  id: string;
  title: string;
  length?: number;
  recording?: MusicBrainzRecording;
};

export type MusicBrainzReleaseDetail = {
  id: string;
  title: string;
  "artist-credit"?: MusicBrainzArtistCredit[];
  media?: Array<{
    tracks?: MusicBrainzReleaseTrack[];
  }>;
};
