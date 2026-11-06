// The browser can't fetch most podcast RSS feeds directly because of CORS,
// so the server fetches iTunes results and feeds on the client's behalf.

const ITUNES_URL = "https://itunes.apple.com";
const FETCH_TIMEOUT_MS = 10000;

const fetchWithTimeout = (url) =>
  fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });

const searchPodcasts = async (req, res, next) => {
  const term = (req.query.term || "").toString().trim();
  if (!term)
    return res.status(400).json({ message: "A search term is required" });

  try {
    const params = new URLSearchParams({ term, entity: "podcast" });
    const result = await fetchWithTimeout(`${ITUNES_URL}/search?${params}`);
    if (!result.ok)
      return res.status(502).json({ message: "Podcast search failed" });

    const { results } = await result.json();
    res.status(200).json(results);
  } catch (error) {
    next(error);
  }
};

const getPodcastFeed = async (req, res, next) => {
  const { id } = req.params;
  if (!/^\d+$/.test(id))
    return res.status(400).json({ message: "Podcast id must be numeric" });

  try {
    const lookup = await fetchWithTimeout(
      `${ITUNES_URL}/lookup?id=${id}&entity=podcast`
    );
    const { results = [] } = lookup.ok ? await lookup.json() : {};
    const feedUrl = results[0]?.feedUrl;
    if (!feedUrl)
      return res.status(404).json({ message: "No feed found for that podcast" });

    const feed = await fetchWithTimeout(feedUrl);
    if (!feed.ok)
      return res.status(502).json({ message: "Could not load the podcast feed" });

    res.status(200).type("text/xml").send(await feed.text());
  } catch (error) {
    next(error);
  }
};

export { searchPodcasts, getPodcastFeed };
