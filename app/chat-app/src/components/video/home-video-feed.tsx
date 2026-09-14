import { listVideos, getVideoPlayback } from "@/services/videos";
import type { VideoItem } from "@/types/video";
import { useVideoPlayer, VideoView } from "expo-video";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, View, useWindowDimensions } from "react-native";

type FeedVideo = VideoItem & { playbackUrl: string };

export default function HomeVideoFeed({ token }: { token: string | null }) {
  const { height, width } = useWindowDimensions();
  const [videos, setVideos] = useState<FeedVideo[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const requestId = useRef(0);

  useEffect(() => {
    if (!token) {
      setVideos([]);
      return;
    }

    const currentRequestId = ++requestId.current;
    setIsLoading(true);
    void (async () => {
      try {
        const response = await listVideos(token);
        const shuffled = [...response.data].sort(() => Math.random() - 0.5);
        const resolvePlayable = async (video: VideoItem): Promise<FeedVideo | null> => {
          try {
            const playback = await getVideoPlayback(token, video.id);
            return { ...video, playbackUrl: playback.data.url };
          } catch (error) {
            console.error("[HomeVideoFeed] Видеото не може да бъде подготвено за възпроизвеждане.", { videoId: video.id, error });
            return null;
          }
        };

        let firstPlayable: FeedVideo | null = null;
        let firstIndex = 0;
        for (; firstIndex < shuffled.length; firstIndex += 1) {
          firstPlayable = await resolvePlayable(shuffled[firstIndex]);
          if (firstPlayable) break;
        }

        if (currentRequestId === requestId.current && firstPlayable) {
          setVideos([firstPlayable]);
          setActiveIndex(0);
          setIsLoading(false);
        }

        const remaining = shuffled.slice(firstPlayable ? firstIndex + 1 : 0);
        const playable = await Promise.all(remaining.map(resolvePlayable));
        if (currentRequestId === requestId.current) {
          setVideos((current) => [...current, ...playable.filter((video): video is FeedVideo => video !== null)]);
        }
      } catch (error) {
        console.error("[HomeVideoFeed] Feed-ът с видеа не може да бъде зареден.", error);
      } finally {
        if (currentRequestId === requestId.current) setIsLoading(false);
      }
    })();

    return () => {
      requestId.current += 1;
    };
  }, [token]);

  const onMomentumScrollEnd = useCallback((offsetY: number) => {
    setActiveIndex(Math.max(0, Math.round(offsetY / height)));
  }, [height]);

  if (!token || (!isLoading && videos.length === 0)) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {isLoading && videos.length === 0 ? <ActivityIndicator style={styles.loader} size="large" color="#ffffff" /> : null}
      <FlatList
        data={videos}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item, index }) => <HomeVideoCard video={item} active={index === activeIndex} width={width} height={height} />}
        getItemLayout={(_, index) => ({ length: height, offset: height * index, index })}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        decelerationRate="fast"
        initialNumToRender={1}
        maxToRenderPerBatch={2}
        windowSize={3}
        onMomentumScrollEnd={(event) => onMomentumScrollEnd(event.nativeEvent.contentOffset.y)}
      />
    </View>
  );
}

function HomeVideoCard({ video, active, width, height }: { video: FeedVideo; active: boolean; width: number; height: number }) {
  const player = useVideoPlayer(video.playbackUrl, (instance) => {
    instance.loop = true;
    instance.muted = false;
  });

  useEffect(() => {
    if (active) {
      player.play();
    } else {
      player.pause();
    }
  }, [active, player]);

  return (
    <View style={{ width, height }}>
      <VideoView player={player} style={styles.video} contentFit="cover" nativeControls={false} />
      <View style={styles.caption} pointerEvents="none">
        <Text style={styles.title} numberOfLines={2}>{video.title}</Text>
        {video.description ? <Text style={styles.description} numberOfLines={3}>{video.description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  loader: { ...StyleSheet.absoluteFill, zIndex: 1 },
  video: { ...StyleSheet.absoluteFill, backgroundColor: "#000" },
  caption: { position: "absolute", left: 16, right: 16, bottom: 180, padding: 14, backgroundColor: "rgba(0,0,0,0.42)" },
  title: { color: "#fff", fontSize: 18, lineHeight: 23, fontWeight: "800" },
  description: { color: "rgba(255,255,255,0.92)", fontSize: 14, lineHeight: 20, marginTop: 6 },
});
