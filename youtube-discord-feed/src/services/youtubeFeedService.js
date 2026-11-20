import Parser from "rss-parser";
import { EmbedBuilder } from "discord.js";
import config from "../configs/config.js";
import { loadLastSeen, saveLastSeen } from "../utils/videoTimestampsLogger.js";
import { sendSysErrorMessage } from "../utils/sysErrorEmbed.js";
import { fileURLToPath } from "url";

const { DISCORD_ROLE_ID, YOUTUBE_FEED } = config;
const __filename = fileURLToPath(import.meta.url);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseItemDate(item) {
  const rawDate = item.isoDate || item.pubDate;
  if (!rawDate) return null;

  const parsedDate = new Date(rawDate);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

/**
 * Retries transient operations (network/API) with exponential backoff.
 */
const retryWithBackoff = async (fn, maxRetries = 3, initialDelayMs = 1000) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      const delayMs = initialDelayMs * Math.pow(2, attempt);
      console.warn(`[WARN] Attempt ${attempt + 1} failed, retrying in ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }
};

function feedUrl(channelId) {
  return `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
}

class youtubeFeedService {
  constructor() {
    this.parser = new Parser({
      customFields: {
        item: [
          ["yt:videoId", "videoId"],
          ["media:group", "mediaGroup"],
        ],
      },
    });
    this.lastSeen = new Map();
    this.lastSeenReady = this.initLastSeen();
  }

  async initLastSeen() {
    this.lastSeen = await loadLastSeen();
  }

  async fetchAndProcessChannels(webhookClient, channels) {
    await this.lastSeenReady;

    if (!channels || channels.length === 0) {
      console.warn("[WARN] No YouTube channels configured");
      return;
    }

    const enabledChannels = channels.filter((channel) => channel.enabled);

    for (const { name, channelId, color } of enabledChannels) {
      if (!channelId) continue;

      try {
        const { MAX_RETRIES, INITIAL_DELAY_MS } = YOUTUBE_FEED.FEED_FETCH_RETRY;
        const feed = await retryWithBackoff(
          () => this.parser.parseURL(feedUrl(channelId)),
          MAX_RETRIES,
          INITIAL_DELAY_MS
        );

        // Prefer the feed's live channel title over the static config name, so a
        // channel rename is picked up automatically instead of going stale.
        const channelName = feed.title || name;

        const sortedItems = this.sortItemsByPubDateAsc(feed.items);
        if (sortedItems.length === 0) {
          console.log(`[INFO] No videos found for ${channelName}.`);
          continue;
        }

        const previous = this.lastSeen.get(channelId);

        if (!previous) {
          const newest = sortedItems[sortedItems.length - 1];
          const wasSent = await this.processAndSendVideo(
            webhookClient,
            newest,
            { channelName, color }
          );

          if (wasSent) {
            this.lastSeen.set(channelId, this.buildState(newest));
            await saveLastSeen(this.lastSeen);
            console.info(`[INFO] First run sent newest video for ${channelName}: ${newest.videoId}`);
          }

          continue;
        }

        // Strictly-newer-than-last-sent, and never the exact video already recorded —
        // guards against duplicate sends even if two entries share a publish timestamp.
        const previousPublishedAt = new Date(previous.publishedAt);
        const newItems = sortedItems.filter((item) => {
          if (item.videoId === previous.videoId) return false;

          const itemDate = parseItemDate(item);
          if (!itemDate) return true;

          return itemDate > previousPublishedAt;
        });

        if (newItems.length === 0) {
          console.log(`[INFO] No new videos for ${channelName}.`);
        } else {
          console.info(`[INFO] ${newItems.length} new video(s) found for ${channelName}, sending oldest-first.`);
        }

        for (const item of newItems) {
          const wasSent = await this.processAndSendVideo(
            webhookClient,
            item,
            { channelName, color }
          );
          if (wasSent) {
            // Persist immediately after each send (not batched at the end) so a crash
            // partway through a backlog can't cause the already-sent videos to be
            // reposted on the next run.
            this.lastSeen.set(channelId, this.buildState(item));
            await saveLastSeen(this.lastSeen);
          }
          // Throttle Discord sends to respect rate limits
          await sleep(YOUTUBE_FEED.THROTTLE_MS.PER_VIDEO);
        }
      } catch (error) {
        this.logFetchError(name, channelId, error);
      }

      // Throttle between channels (rate limit safety)
      await sleep(YOUTUBE_FEED.THROTTLE_MS.PER_CHANNEL);
    }
  }

  buildState(item) {
    return {
      videoId: item.videoId,
      publishedAt: parseItemDate(item)?.toISOString() ?? new Date().toISOString(),
    };
  }

  /**
   * Oldest first, so if a later send fails the state progression stops at a safe point.
   */
  sortItemsByPubDateAsc(items) {
    return [...items].sort(
      (a, b) => {
        const firstDate = parseItemDate(a) ?? new Date(0);
        const secondDate = parseItemDate(b) ?? new Date(0);
        return firstDate - secondDate;
      }
    );
  }

  getThumbnail(item) {
    const thumb = item.mediaGroup?.["media:thumbnail"]?.[0]?.$?.url;
    return thumb || null;
  }

  async processAndSendVideo(webhookClient, item, { channelName, color }) {
    try {
      const embed = new EmbedBuilder()
        .setColor(color || YOUTUBE_FEED.DEFAULT_EMBED_COLOR)
        .setTitle(item.title)
        .setURL(item.link);

      const thumbnail = this.getThumbnail(item);
      if (thumbnail) {
        embed.setImage(thumbnail);
      }

      await webhookClient.send({
        content: DISCORD_ROLE_ID ? `<@&${DISCORD_ROLE_ID}>` : undefined,
        allowedMentions: DISCORD_ROLE_ID ? { roles: [DISCORD_ROLE_ID] } : undefined,
        embeds: [embed],
      });

      console.info(`[INFO] New video sent for ${channelName}: ${item.title}`);
      return true;
    } catch (error) {
      console.error(`[ERROR] Failed to process video: ${item.link}`, error);
      sendSysErrorMessage(__filename, `- Failed to process video: ${item.link}`);
      return false;
    }
  }

  logFetchError(channelName, channelId, error) {
    console.error(
      `[ERROR] Failed to fetch YouTube feed:\n Channel: ${channelName} (${channelId})\n`,
      error
    );
    sendSysErrorMessage(
      __filename,
      `There was an error fetching the YouTube feed:\n- Channel: ${channelName}\n- Channel ID: ${channelId}\n`
    );
  }
}

export default new youtubeFeedService();
