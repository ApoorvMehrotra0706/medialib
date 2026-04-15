export type MediaType = "book" | "movie" | "tv" | "game" | "anime";
export type Status = "want" | "ongoing" | "completed" | "dropped";

export interface MediaItem {
  id: string;
  user_id: string;
  external_id: string;
  media_type: MediaType;
  title: string;
  cover?: string;
  year?: string;
  description?: string;
  genres?: string;
  status: Status;
  rating?: number;
  review?: string;
  created_at: string;
  updated_at: string;
}

export interface SearchResult {
  external_id: string;
  media_type: MediaType;
  title: string;
  cover?: string;
  year?: string;
  description?: string;
  genres?: string;
}
